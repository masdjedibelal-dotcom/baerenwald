/**
 * Partner Vorgänge-Flow-Check (read-only) gegen Live-DB.
 * npx tsx --env-file=.env.local scripts/verify-partner-offen-flow.ts
 */
import {
  buildPartnerVorgaenge,
  countPartnerVorgaengeFilter,
} from "@/lib/partner/build-partner-vorgaenge";
import { isPartnerAngebotOffenListItem } from "@/lib/partner/partner-offen-status";
import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import {
  hasPartnerKonditionenNachreichungAusstehend,
  parsePartnerHwKonditionen,
} from "@/lib/partner/partner-konditionen";
import { resolvePartnerListenTitel } from "@/lib/partner/partner-listen-titel";
import { aggregateAuftragHandwerkerStatus } from "@/lib/partner/partner-portal-phase";
import { vorgangStateLabel } from "@/lib/partner/vorgang-state";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const TEST_EMAIL = "info@baerenwald-muenchen.de";

type Issue = { level: "error" | "warn"; msg: string };

function mapAenderungTyp(raw: unknown): "neu" | "geaendert" | "entfernt" | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "neu" || v === "geaendert" || v === "entfernt") return v;
  return null;
}

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
  console.log(`\n=== Partner-Vorgänge-Check: ${hw.name} ===\n`);

  const issues: Issue[] = [];

  const { data: ahRows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      "id, angebot_id, gewerk_id, status, hw_status, bestaetigt_at, antwort_at, gesendet_at, hw_konditionen, hw_eingereicht_at"
    )
    .eq("handwerker_id", hwId);

  const { data: posRows } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, auftrag_id, gewerk_name, leistung_name, handwerker_status, preis_partner, handwerker_id, aenderung_typ, preis_alt"
    )
    .eq("handwerker_id", hwId);

  const auftragIds = [...new Set((posRows ?? []).map((p) => String(p.auftrag_id)))];
  const { data: hwZuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id, status, projektvertrag_bestaetigt_am")
    .eq("handwerker_id", hwId);

  const vertragByAuftrag = new Map(
    (hwZuweisungen ?? []).map((z) => [
      String(z.auftrag_id),
      (z.projektvertrag_bestaetigt_am as string | null) ?? null,
    ])
  );
  const zuweisungByAuftrag = new Map(
    (hwZuweisungen ?? []).map((z) => [String(z.auftrag_id), String(z.status ?? "")])
  );

  const { data: auftragRows } = auftragIds.length
    ? await supabaseAdmin
        .from("auftraege")
        .select("id, titel, status, angebot_id, start_datum, end_datum, handwerker_bestaetigt_at")
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
      beschreibung: null,
      menge: null,
      einheit: null,
      start_datum: null,
      end_datum: null,
      preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
      handwerker_status: (p.handwerker_status as string | null) ?? null,
      aenderung_typ: mapAenderungTyp(p.aenderung_typ),
      preis_alt: p.preis_alt != null ? Number(p.preis_alt) : null,
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
      projektvertrag_bestaetigt_am: vertragByAuftrag.get(String(auftrag?.id ?? "")) ?? null,
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
      beschreibung: null,
      menge: null,
      einheit: null,
      start_datum: null,
      end_datum: null,
      preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
      lohn_fix: null,
      material_fix: null,
      handwerker_status: (p.handwerker_status as string | null) ?? null,
      aenderung_typ: mapAenderungTyp(p.aenderung_typ),
      preis_alt: p.preis_alt != null ? Number(p.preis_alt) : null,
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
      handwerker_bestaetigt_at:
        (raw.handwerker_bestaetigt_at as string | null)?.slice(0, 19) ?? null,
      projektvertrag_bestaetigt_am: vertragByAuftrag.get(aid) ?? null,
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

  const vorgaenge = buildPartnerVorgaenge({
    alleAuftraege: auftragItems,
    anfragen: anfragenAngebot,
  });
  const counts = countPartnerVorgaengeFilter(vorgaenge);

  console.log(`--- Tab „Vorgänge“ (${vorgaenge.length} gesamt, ${counts.offen} offen) ---`);
  for (const v of vorgaenge) {
    const label = vorgangStateLabel(v.state);
    const meta = v.auftrag.positionen
      .filter((p) => p.aenderung_typ)
      .map((p) => `${p.leistung_name}:${p.aenderung_typ}`)
      .join(", ");
    console.log(
      `  ✅ [${label}] ${v.auftrag.listen_titel}${meta ? ` (${meta})` : ""}`
    );
    if (!["Neu", "Geändert", "Durchführung", "Erledigt"].includes(label)) {
      issues.push({ level: "error", msg: `Ungültiger Vorgangs-State: ${label}` });
    }
  }

  const dup = new Map<string, number>();
  for (const v of vorgaenge) {
    dup.set(v.id, (dup.get(v.id) ?? 0) + 1);
  }
  for (const [aid, n] of dup) {
    if (n > 1) {
      issues.push({ level: "error", msg: `Doppel-Vorgang: ${n}x für ${aid.slice(0, 8)}` });
    }
  }

  const legacyAuftragAnfragen = auftragItems.filter((a) => {
    if (!isPartnerAuftragAnfrageAktionErforderlich(a)) return false;
    if (!a.angebot_id) return true;
    return !anfragenAngebot.some((x) => x.angebot_id === a.angebot_id);
  });
  for (const a of legacyAuftragAnfragen) {
    const v = vorgaenge.find((x) => x.id === a.id);
    if (!v || v.state !== "neu") {
      issues.push({
        level: "error",
        msg: `Auftrags-Zuweisung ohne Vorgang „Neu“: ${a.listen_titel}`,
      });
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
          aenderung_typ: mapAenderungTyp(p.aenderung_typ),
        })),
        hw_konditionen: parsePartnerHwKonditionen(row.hw_konditionen),
        hw_status: String(row.hw_status),
        handwerker_id: hwId,
      });
      console.log(
        `  Legacy eingereicht → ${nach ? "erscheint als Geändert/Neu" : "⚠ kein offener Vorgang"} (angebot ${String(row.angebot_id).slice(0, 8)})`
      );
      if (!nach) {
        issues.push({ level: "warn", msg: "Legacy eingereicht ohne sichtbaren Vorgang" });
      }
    }
  }

  for (const p of posRows ?? []) {
    const typ = mapAenderungTyp(p.aenderung_typ);
    if (typ === "geaendert" && (p.preis_alt == null || Number(p.preis_alt) <= 0)) {
      issues.push({
        level: "warn",
        msg: `geaendert ohne preis_alt: ${String(p.leistung_name).slice(0, 40)}`,
      });
    }
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
