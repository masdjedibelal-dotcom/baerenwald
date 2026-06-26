"use server";

import { revalidatePath } from "next/cache";

import {
  buildPartnerHwKonditionenFromAuftragEingabe,
  buildPartnerHwKonditionenFromEingabe,
  parsePartnerKonditionenEingabe,
  remapAuftragKonditionenEingabe,
} from "@/lib/partner/apply-partner-hw-konditionen";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from "@/lib/partner/handwerker-ablehnung";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { isPartnerAuftragAnfrageOffen } from "@/lib/partner/partner-anfrage-status";
import {
  sendPartnerInternalAnfrageAntwortMail,
  sendPartnerInternalAngebotMail,
} from "@/lib/partner/partner-mail";
import { aggregateAuftragHandwerkerStatus } from "@/lib/partner/partner-portal-phase";
import { syncAngebotHandwerkerAfterAuftragAccept } from "@/lib/partner/sync-angebot-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { PartnerHwKonditionen } from "@/lib/partner/partner-konditionen";

export type PartnerAuftragAntwortResult =
  | { ok: true; angebotAnfrageId?: string | null }
  | { ok: false; error: string };

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

function mapAuftragPositionen(
  posRows: Array<Record<string, unknown>>
): PartnerAuftragPosition[] {
  return posRows.map((p) => ({
    id: String(p.id),
    gewerk_name: String(p.gewerk_name ?? "Gewerk"),
    leistung_name: String(p.leistung_name ?? "Leistung"),
    beschreibung: (p.beschreibung as string | null) ?? null,
    menge: p.menge != null ? Number(p.menge) : null,
    einheit: (p.einheit as string | null) ?? null,
    start_datum: (p.start_datum as string | null)?.slice(0, 10) ?? null,
    end_datum: (p.end_datum as string | null)?.slice(0, 10) ?? null,
    preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
    lohn_fix: p.lohn_fix != null ? Number(p.lohn_fix) : null,
    material_fix: p.material_fix != null ? Number(p.material_fix) : null,
  }));
}

/** Annahme/Ablehnung einer Leistungs-Zuweisung am Auftrag (CRM-Flow, nicht angebot_handwerker). */
export async function respondPartnerAuftragZuweisung(opts: {
  auftragId: string;
  antwort: "akzeptiert" | "abgelehnt";
  grund?: string;
  notiz?: string;
  konditionenJson?: string;
}): Promise<PartnerAuftragAntwortResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const auftragId = opts.auftragId.trim();
  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };

  const grundRaw = opts.grund?.trim() ?? "";
  if (opts.antwort === "abgelehnt") {
    if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
      return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
    }
  }

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, angebot_id, start_datum")
    .eq("id", auftragId)
    .maybeSingle();

  if (aErr || !auftrag) {
    return { ok: false, error: "Auftrag nicht gefunden." };
  }

  const { data: zuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, status, gewerk_id, gewerke(name)")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, handwerker_status, gewerk_name, gewerk_id, leistung_name, beschreibung, preis_partner, lohn_fix, material_fix, menge, einheit, start_datum, end_datum"
    )
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  const rows = zuweisungen ?? [];
  const posRows = positionen ?? [];
  if (!rows.length && !posRows.length) {
    return { ok: false, error: "Keine Zuweisung für diesen Auftrag." };
  }

  const hwStatus = aggregateAuftragHandwerkerStatus(
    rows.map((z) => String(z.status ?? "")),
    posRows.map((p) => p.handwerker_status)
  );

  const angebotId = auftrag.angebot_id != null ? String(auftrag.angebot_id) : "";

  let angebotAnfrageId: string | null = null;
  let konditionenAusstehend = false;

  if (angebotId && opts.antwort === "akzeptiert") {
    const { data: ahRows } = await supabaseAdmin
      .from("angebot_handwerker")
      .select("id, hw_eingereicht_at, hw_status")
      .eq("angebot_id", angebotId)
      .eq("handwerker_id", link.handwerkerId)
      .order("antwort_at", { ascending: false });

    const ahRow = (ahRows ?? [])[0];
    angebotAnfrageId = ahRow?.id ? String(ahRow.id) : null;
    const ahSt = String(ahRow?.hw_status ?? "").toLowerCase();

    if (ahSt === "uebernommen") {
      return {
        ok: false,
        error:
          "Die Konditionen wurden bereits bestätigt. Bitte unter „Angebote“ fortfahren.",
      };
    }

    if (ahSt === "bestaetigt") {
      return {
        ok: false,
        error:
          "Bitte Konditionen unter „Anfragen“ bestätigen.",
      };
    }

    if (ahSt === "eingereicht") {
      return {
        ok: false,
        error:
          "Dein Angebot wird bereits geprüft. Bitte warte auf die Rückmeldung von Bärenwald.",
      };
    }

    konditionenAusstehend =
      hwStatus === "akzeptiert" &&
      Boolean(angebotAnfrageId) &&
      !ahRow?.hw_eingereicht_at &&
      ahSt !== "eingereicht";
  }

  const kannAntworten = isPartnerAuftragAnfrageOffen({
    status: String(auftrag.status ?? ""),
    hwStatus,
    start_datum: (auftrag as { start_datum?: string | null }).start_datum ?? null,
    positionen: posRows.map((p) => ({
      start_datum: (p as { start_datum?: string | null }).start_datum ?? null,
    })),
  });

  if (!kannAntworten && !(opts.antwort === "akzeptiert" && konditionenAusstehend)) {
    return { ok: false, error: "Diese Zuweisung kann nicht mehr beantwortet werden." };
  }

  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;
  const auftragPositionen = mapAuftragPositionen(posRows as Array<Record<string, unknown>>);

  let builtKonditionen:
    | {
        konditionen: PartnerHwKonditionen;
        preisNetto: number;
        preisBrutto: number;
      }
    | null = null;

  if (opts.antwort === "akzeptiert") {
    const konditionenRaw = opts.konditionenJson?.trim() ?? "";
    if (!konditionenRaw) {
      return { ok: false, error: "Bitte die Angebotspreise je Leistung angeben." };
    }

    const parsed = parsePartnerKonditionenEingabe(konditionenRaw);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const auftragBuilt = buildPartnerHwKonditionenFromAuftragEingabe({
      auftragPositionen,
      eingabe: parsed.rows,
    });
    if (!auftragBuilt.ok) return { ok: false, error: auftragBuilt.error };
    builtKonditionen = auftragBuilt;

    if (angebotId) {
      const { data: angebotRow } = await supabaseAdmin
        .from("angebote")
        .select("positionen")
        .eq("id", angebotId)
        .maybeSingle();

      if (!angebotAnfrageId) {
        const synced = await syncAngebotHandwerkerAfterAuftragAccept({
          handwerkerId: link.handwerkerId,
          angebotId,
          auftragId,
        });
        angebotAnfrageId = synced.anfrageId;
      }

      if (angebotAnfrageId) {
        const { data: ahRow } = await supabaseAdmin
          .from("angebot_handwerker")
          .select("gewerk_id")
          .eq("id", angebotAnfrageId)
          .maybeSingle();

        const remapped = remapAuftragKonditionenEingabe({
          auftragPositionen,
          angebotPositionenRaw: (angebotRow as { positionen?: unknown } | null)?.positionen,
          gewerkId: String((ahRow as { gewerk_id?: string } | null)?.gewerk_id ?? ""),
          eingabe: parsed.rows,
        });

        if (remapped.ok) {
          const angebotBuilt = buildPartnerHwKonditionenFromEingabe({
            positionenRaw: (angebotRow as { positionen?: unknown } | null)?.positionen,
            gewerkId: String((ahRow as { gewerk_id?: string } | null)?.gewerk_id ?? ""),
            eingabe: remapped.rows,
          });
          if (angebotBuilt.ok) builtKonditionen = angebotBuilt;
        }
      }
    }
  }

  const newStatus = opts.antwort === "akzeptiert" ? "akzeptiert" : "abgelehnt";

  if (kannAntworten) {
    for (const z of rows) {
      const st = String(z.status ?? "").toLowerCase();
      if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
      await supabaseAdmin
        .from("auftrag_handwerker")
        .update({ status: newStatus })
        .eq("id", z.id);
    }

    for (const p of posRows) {
      const st = String(p.handwerker_status ?? "").toLowerCase();
      if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
      await supabaseAdmin
        .from("auftrag_positionen")
        .update({
          handwerker_status: newStatus,
          ...(newStatus === "akzeptiert" ? { handwerker_angefragt_at: now } : {}),
        })
        .eq("id", p.id);
    }
  }

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name")
    .eq("id", link.handwerkerId)
    .maybeSingle();

  const gewerkName =
    posRows[0]?.gewerk_name?.trim() ||
    (one(rows[0]?.gewerke as unknown) as { name?: string } | null)?.name?.trim() ||
    "Gewerk";

  const grundLabel =
    opts.antwort === "abgelehnt" && isHandwerkerAblehnungGrund(grundRaw)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[grundRaw]
      : null;

  if (opts.antwort === "akzeptiert" && builtKonditionen && angebotId && angebotAnfrageId) {
    const konditionen = builtKonditionen.konditionen;
    konditionen.eingereicht_at = now;

    const { error: kondErr } = await supabaseAdmin
      .from("angebot_handwerker")
      .update({
        status: "akzeptiert",
        antwort_at: now,
        hw_konditionen: konditionen,
        hw_preis_netto: builtKonditionen.preisNetto,
        hw_preis_brutto: builtKonditionen.preisBrutto,
        hw_eingereicht_at: now,
        hw_status: "eingereicht",
        hw_notiz: notiz,
        hw_crm_notiz: null,
        hw_crm_antwort_at: null,
        antwort_notiz: notiz,
      })
      .eq("id", angebotAnfrageId)
      .eq("handwerker_id", link.handwerkerId);

    if (kondErr) return { ok: false, error: kondErr.message };

    const { data: angebotRow } = await supabaseAdmin
      .from("angebote")
      .select("kunden(plz, ort), leads(plz)")
      .eq("id", angebotId)
      .maybeSingle();

    const artLabel =
      konditionen.art === "bestaetigt" ? "Konditionen bestätigt" : "Preise angepasst";
    const kunde = one(
      (angebotRow as { kunden?: unknown } | null)?.kunden as
        | { plz?: string | null }
        | { plz?: string | null }[]
        | null
    );
    const leadPlz = one(
      (angebotRow as { leads?: unknown } | null)?.leads as
        | { plz?: string | null }
        | { plz?: string | null }[]
        | null
    );

    void sendPartnerInternalAngebotMail({
      handwerkerName: (hw?.name as string)?.trim() || "Partner",
      firma: null,
      gewerkName,
      plz: (kunde as { plz?: string | null } | null)?.plz?.trim() || leadPlz?.plz?.trim() || "—",
      preisNetto: builtKonditionen.preisNetto,
      preisBrutto: builtKonditionen.preisBrutto,
      angebotId,
      angebotPdfUrl: null,
      konditionenArt: artLabel,
      positionen: konditionen.positionen.map((p) => ({
        leistung: p.leistung,
        ekNetto: p.ek_netto,
        hwNetto: p.hw_netto,
        geaendert: p.geaendert,
        hwNotiz: p.hw_notiz,
      })),
    });
  }

  if (angebotId && kannAntworten) {
    await sendPartnerInternalAnfrageAntwortMail({
      handwerkerName: (hw?.name as string)?.trim() || "Partner",
      gewerkName,
      angenommen: opts.antwort === "akzeptiert",
      ablehnungGrundLabel: grundLabel,
      notiz,
      angebotId,
      partnerAngebotPortalUrl: null,
    });
  }

  revalidatePath("/partner");
  return {
    ok: true,
    angebotAnfrageId: opts.antwort === "akzeptiert" ? angebotAnfrageId : null,
  };
}
