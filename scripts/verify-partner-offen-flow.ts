/**
 * Vollständiger Partner-Flow-Check (read-only) gegen Live-DB.
 * npx tsx --env-file=.env.local scripts/verify-partner-offen-flow.ts
 */
import {
  buildPartnerOffenListe,
  isPartnerAngebotOffenListItem,
  partnerOffenStatusLabel,
} from "@/lib/partner/partner-offen-status";
import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import { isPartnerAuftragListItemAktiv as isAktiv } from "@/lib/partner/partner-list-filters";
import {
  hasPartnerKonditionenNachreichungAusstehend,
  parsePartnerHwKonditionen,
} from "@/lib/partner/partner-konditionen";
import { resolvePartnerListenTitel } from "@/lib/partner/partner-listen-titel";
import { aggregateAuftragHandwerkerStatus } from "@/lib/partner/partner-portal-phase";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const TEST_EMAIL = "info@baerenwald-muenchen.de";

type Issue = { level: "error" | "warn"; msg: string };

async function main() {
  if (!isSupabaseConfigured()) process.exit(1);

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("id, name, email")
    .ilike("email", TEST_EMAIL)
    .maybeSingle();
  if (!hw?.id) {
    console.error("Handwerker nicht gefunden");
    process.exit(1);
  }
  const hwId = String(hw.id);
  console.log(`\n=== Partner-Flow-Check: ${hw.name} ===\n`);

  const issues: Issue[] = [];

  const { data: ahRows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, angebot_id, gewerk_id, status, hw_status, bestaetigt_at, antwort_at, gesendet_at, hw_konditionen, hw_eingereicht_at")
    .eq("handwerker_id", hwId);

  const { data: posRows } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, auftrag_id, gewerk_name, leistung_name, handwerker_status, preis_partner, handwerker_id")
    .eq("handwerker_id", hwId);

  const auftragIds = [...new Set((posRows ?? []).map((p) => String(p.auftrag_id)))];
  const { data: hwZuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id, status")
    .eq("handwerker_id", hwId);

  const zuweisungByAuftrag = new Map(
    (hwZuweisungen ?? []).map((z) => [String(z.auftrag_id), String(z.status ?? "")])
  );

  const { data: auftragRows } = auftragIds.length
    ? await supabaseAdmin
        .from("auftraege")
        .select("id, titel, status, angebot_id, start_datum, end_datum")
        .in("id", auftragIds)
    : { data: [] };

  const posByAuftrag = new Map<string, typeof posRows>();
  for (const p of posRows ?? []) {
    const aid = String(p.auftrag_id);
    const list = posByAuftrag.get(aid) ?? [];
    list.push(p);
    posByAuftrag.set(aid, list);
  }

  const { data: gewerke } = await supabaseAdmin.from("gewerke").select("id, name");
  const gewerkName = new Map((gewerke ?? []).map((g) => [String(g.id), String(g.name)]));

  const anfragenItems = (ahRows ?? []).map((row) => {
    const angebotId = String(row.angebot_id);
    const auftrag = (auftragRows ?? []).find((a) => String(a.angebot_id) === angebotId);
    const pos = (posByAuftrag.get(String(auftrag?.id ?? "")) ?? []).map((p) => ({
      id: String(p.id),
      gewerk_name: String(p.gewerk_name ?? "Gewerk"),
      leistung_name: String(p.leistung_name ?? "Leistung"),
      preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
      handwerker_status: (p.handwerker_status as string | null) ?? null,
    }));

    return {
      id: String(row.id),
      angebot_id: angebotId,
      gewerk_id: String(row.gewerk_id ?? ""),
      gewerk_name: gewerkName.get(String(row.gewerk_id ?? "")) ?? "Gewerk",
      handwerker_id: hwId,
      status: String(row.status ?? ""),
      hw_status: String(row.hw_status ?? ""),
      bestaetigt_at: row.bestaetigt_at as string | null,
      antwort_at: row.antwort_at as string | null,
      gesendet_at: row.gesendet_at as string | null,
      hw_eingereicht_at: row.hw_eingereicht_at as string | null,
      hw_konditionen: parsePartnerHwKonditionen(row.hw_konditionen),
      crm_auftrag_positionen: pos,
      alle_hw_konditionen: (ahRows ?? []).map((r) =>
        parsePartnerHwKonditionen(r.hw_konditionen)
      ),
      auftrag_id: auftrag ? String(auftrag.id) : null,
      listen_titel: resolvePartnerListenTitel({
        gewerk_name: gewerkName.get(String(row.gewerk_id ?? "")) ?? "Gewerk",
        fallbackTitel: auftrag?.titel ?? "Projekt",
      }),
      positionen: [],
      lead: null,
      plz: "",
      ort: "",
      angebot_titel: auftrag?.titel ?? "",
      projektvertrag_bestaetigt_am: null,
      crm_positionen_raw: null,
    };
  });

  const anfragenAngebot = anfragenItems.filter((a) => isPartnerAngebotOffenListItem(a));

  const auftragItems = (auftragRows ?? []).map((raw) => {
    const aid = String(raw.id);
    const ownPos = (posByAuftrag.get(aid) ?? []).map((p) => ({
      id: String(p.id),
      gewerk_name: String(p.gewerk_name ?? "Gewerk"),
      leistung_name: String(p.leistung_name ?? "Leistung"),
      handwerker_status: (p.handwerker_status as string | null) ?? null,
      start_datum: null,
    }));
    const angebotId = raw.angebot_id != null ? String(raw.angebot_id) : "";
    const anfrage = anfragenItems.find((a) => a.angebot_id === angebotId);
    const hwStatus = aggregateAuftragHandwerkerStatus(
      [zuweisungByAuftrag.get(aid) ?? "angefragt"],
      ownPos.map((p) => p.handwerker_status)
    );
    const listen_titel = anfrage?.gewerk_name
      ? resolvePartnerListenTitel({
          gewerk_name: anfrage.gewerk_name,
          fallbackTitel: String(raw.titel ?? "Auftrag"),
        })
      : resolvePartnerListenTitel({
          gewerk_names: ownPos.map((p) => p.gewerk_name),
          fallbackTitel: String(raw.titel ?? "Auftrag"),
        });

    return {
      id: aid,
      titel: String(raw.titel ?? "Auftrag"),
      listen_titel,
      status: String(raw.status ?? ""),
      angebot_id: angebotId || null,
      angebotHandwerkerId: anfrage?.id ?? null,
      angebotHwStatus: anfrage?.hw_status ?? null,
      angebotHwEingereichtAt: anfrage?.hw_eingereicht_at ?? null,
      hwStatus,
      start_datum: (raw.start_datum as string | null) ?? null,
      end_datum: (raw.end_datum as string | null) ?? null,
      positionen: ownPos,
      plz: "—",
      ort: "—",
      lead: null,
      fortschritt: null,
      portalPhase: "auftrag" as const,
      bautagebuch: [],
      bewertung: null,
    };
  });

  const auftragAnfragen = auftragItems.filter((a) => {
    if (!isPartnerAuftragAnfrageAktionErforderlich(a)) return false;
    if (!a.angebot_id) return true;
    return !anfragenAngebot.some((x) => x.angebot_id === a.angebot_id);
  });

  const auftraege = auftragItems.filter(
    (a) => !isPartnerAuftragAnfrageAktionErforderlich(a)
  );

  const offen = buildPartnerOffenListe({ anfragen: anfragenAngebot, auftragAnfragen });

  console.log(`--- Erwarteter Tab „Offen“ (${offen.length} Karten) ---`);
  for (const e of offen) {
    if (e.kind === "angebot") {
      const badge = partnerOffenStatusLabel(e.item.offen_karten_typ);
      console.log(`  ✅ [${badge}] ${e.item.listen_titel}`);
      if (!["Neu", "Ergänzung"].includes(badge)) {
        issues.push({ level: "error", msg: `Ungültiges Badge: ${badge}` });
      }
    } else {
      console.log(`  ✅ [Neu] ${e.item.listen_titel} (nur Auftrag, kein Angebot)`);
    }
  }

  console.log(`\n--- Erwarteter Tab „Meine Aufträge / Ausführung“ (${auftraege.filter(isAktiv).length} aktiv) ---`);
  for (const a of auftraege) {
    const aktiv = isAktiv(a);
    if (!aktiv) {
      console.log(`  [Erledigt] ${a.listen_titel}`);
      continue;
    }
    const inOffen = offen.some(
      (e) =>
        (e.kind === "angebot" && e.item.auftrag_id === a.id) ||
        (e.kind === "auftrag" && e.item.id === a.id)
    );
    console.log(`  ${inOffen ? "⚠ auch Offen" : "✅"} ${a.listen_titel} (hw=${a.hwStatus})`);
    if (inOffen && a.hwStatus === "akzeptiert") {
      issues.push({ level: "error", msg: `Parallel Offen+Ausführung: ${a.listen_titel}` });
    }
  }

  console.log("\n--- Daten-Hinweise ---");
  for (const row of ahRows ?? []) {
    if (String(row.hw_status).toLowerCase() === "eingereicht" && !row.bestaetigt_at) {
      const auftrag = (auftragRows ?? []).find((a) => String(a.angebot_id) === String(row.angebot_id));
      const pos = posByAuftrag.get(String(auftrag?.id ?? "")) ?? [];
      const nach = hasPartnerKonditionenNachreichungAusstehend({
        crm_auftrag_positionen: pos.map((p) => ({
          id: String(p.id),
          gewerk_name: String(p.gewerk_name ?? ""),
          leistung_name: String(p.leistung_name ?? ""),
          handwerker_status: (p.handwerker_status as string | null) ?? null,
        })),
        hw_konditionen: parsePartnerHwKonditionen(row.hw_konditionen),
        hw_status: String(row.hw_status),
        handwerker_id: hwId,
      });
      console.log(
        `  Legacy eingereicht → ${nach ? "erscheint als Ergänzung in Offen" : "⚠ nicht in Offen"} (angebot ${String(row.angebot_id).slice(0, 8)})`
      );
      if (!nach) {
        issues.push({ level: "warn", msg: `Legacy eingereicht ohne sichtbare Ergänzung` });
      }
    }
  }

  const dup = new Map<string, number>();
  for (const e of offen) {
    const aid = e.kind === "angebot" ? e.item.auftrag_id : e.item.id;
    if (!aid) continue;
    dup.set(aid, (dup.get(aid) ?? 0) + 1);
  }
  for (const [aid, n] of dup) {
    if (n > 1) issues.push({ level: "error", msg: `Doppelkarte: ${n}x für Auftrag ${aid.slice(0, 8)}` });
  }

  console.log("\n=== Ergebnis ===");
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  if (!issues.length) console.log("✅ Daten und Logik konsistent.");
  else {
    errors.forEach((i) => console.log(`❌ ${i.msg}`));
    warns.forEach((i) => console.log(`⚠️  ${i.msg}`));
  }
  console.log(`\n${errors.length} Fehler, ${warns.length} Warnungen`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
