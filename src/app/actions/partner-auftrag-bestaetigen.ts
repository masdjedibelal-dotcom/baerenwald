"use server";

import { revalidatePath } from "next/cache";

import { buildPartnerHwKonditionenFromAuftragEingabe, buildPartnerHwKonditionenFromEingabe } from "@/lib/partner/apply-partner-hw-konditionen";
import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from "@/lib/partner/handwerker-ablehnung";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { isPartnerAngebotOffenListItem } from "@/lib/partner/partner-offen-status";
import {
  buildKonditionenEingabeFromZeilen,
  buildPartnerKonditionZeilen,
  hasPartnerKonditionenNachreichungAusstehend,
  parsePartnerHwKonditionen,
  resolveNachreichungOpenZeilenIds,
  type PartnerHwKonditionen,
} from "@/lib/partner/partner-konditionen";
import { buildPartnerAuftragKonditionZeilen } from "@/lib/partner/partner-leistungen-display";
import { sendPartnerInternalAnfrageAntwortMail } from "@/lib/partner/partner-mail";
import { syncAngebotHandwerkerAfterAuftragAccept } from "@/lib/partner/sync-angebot-handwerker";
import { positionBrauchtVorgangAktion } from "@/lib/partner/vorgang-state";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAuftragBestaetigenResult =
  | { ok: true }
  | { ok: false; error: string };

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

async function loadAuftragPositionen(
  auftragId: string,
  handwerkerId: string
): Promise<PartnerAuftragPosition[]> {
  const { data: rows } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, gewerk_name, leistung_name, beschreibung, menge, einheit, start_datum, end_datum, preis_partner, lohn_fix, material_fix, handwerker_status, aenderung_typ, preis_alt"
    )
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId);

  return (rows ?? []).map((p) => {
    const raw = p as Record<string, unknown>;
    const besch = (raw.beschreibung as string | null) ?? null;
    return {
      id: String(raw.id),
      gewerk_name: String(raw.gewerk_name ?? "Gewerk"),
      leistung_name:
        stripHtmlToPlainText(String(raw.leistung_name ?? "")) || "Leistung",
      beschreibung: besch?.trim() ? stripHtmlToPlainText(besch) || null : null,
      menge: raw.menge != null ? Number(raw.menge) : null,
      einheit: (raw.einheit as string | null) ?? null,
      start_datum: (raw.start_datum as string | null)?.slice(0, 10) ?? null,
      end_datum: (raw.end_datum as string | null)?.slice(0, 10) ?? null,
      preis_partner:
        raw.preis_partner != null ? Number(raw.preis_partner) : null,
      lohn_fix: raw.lohn_fix != null ? Number(raw.lohn_fix) : null,
      material_fix: raw.material_fix != null ? Number(raw.material_fix) : null,
      handwerker_status: (raw.handwerker_status as string | null) ?? null,
      aenderung_typ: (() => {
        const v = (raw.aenderung_typ as string | null)?.trim().toLowerCase();
        if (v === "neu" || v === "geaendert" || v === "entfernt") return v;
        return null;
      })(),
      preis_alt: raw.preis_alt != null ? Number(raw.preis_alt) : null,
    };
  });
}

async function loadAlleHwKonditionenForAngebot(
  angebotId: string,
  handwerkerId: string
) {
  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("hw_konditionen")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId);

  return (rows ?? []).map((row) =>
    parsePartnerHwKonditionen((row as { hw_konditionen?: unknown }).hw_konditionen)
  );
}

type AcceptKonditionenResult =
  | {
      ok: true;
      konditionen: PartnerHwKonditionen;
      preisNetto: number;
      preisBrutto: number;
      openPositionIds: string[];
    }
  | { ok: false; error: string };

function buildAcceptKonditionen(opts: {
  auftragPositionen: PartnerAuftragPosition[];
  openPositionIds: string[];
  existingHw?: PartnerHwKonditionen | null;
}): AcceptKonditionenResult {
  const openSet = new Set(opts.openPositionIds);
  const targetPositionen = opts.auftragPositionen.filter((p) => openSet.has(p.id));
  if (!targetPositionen.length) {
    return { ok: false, error: "Keine offenen Leistungen gefunden." };
  }

  const zeilen = buildPartnerAuftragKonditionZeilen(targetPositionen);
  const eingabe = buildKonditionenEingabeFromZeilen(zeilen);
  if (!eingabe) {
    return {
      ok: false,
      error: "Für die offenen Leistungen fehlt noch ein Angebotspreis von Bärenwald.",
    };
  }

  const built = buildPartnerHwKonditionenFromAuftragEingabe({
    auftragPositionen: targetPositionen,
    eingabe,
  });
  if (!built.ok) return built;

  let konditionen = built.konditionen;
  if (opts.existingHw?.positionen.length) {
    const byId = new Map(opts.existingHw.positionen.map((p) => [p.position_id, p]));
    for (const p of konditionen.positionen) {
      byId.set(p.position_id, p);
    }
    konditionen = {
      ...konditionen,
      positionen: Array.from(byId.values()),
    };
  }

  return {
    ok: true,
    konditionen,
    preisNetto: built.preisNetto,
    preisBrutto: built.preisBrutto,
    openPositionIds: opts.openPositionIds,
  };
}

async function persistAcceptance(opts: {
  anfrageId: string;
  handwerkerId: string;
  angebotId: string;
  auftragId: string | null;
  konditionen: PartnerHwKonditionen;
  preisNetto: number;
  preisBrutto: number;
  openPositionIds: string[];
  auftragPositionen?: PartnerAuftragPosition[];
  projektvertragNoetig: boolean;
  gelesen: boolean;
  verbindlich: boolean;
}): Promise<PartnerAuftragBestaetigenResult> {
  const now = new Date().toISOString();

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      status: "angenommen",
      antwort_at: now,
      bestaetigt_at: now,
      hw_status: "uebernommen",
      hw_konditionen: opts.konditionen,
      hw_preis_netto: opts.preisNetto,
      hw_preis_brutto: opts.preisBrutto,
      hw_eingereicht_at: now,
    })
    .eq("id", opts.anfrageId)
    .eq("handwerker_id", opts.handwerkerId);

  if (upErr) return { ok: false, error: upErr.message };

  if (opts.auftragId) {
    await supabaseAdmin
      .from("auftraege")
      .update({ handwerker_bestaetigt_at: now })
      .eq("id", opts.auftragId);

    for (const posId of opts.openPositionIds) {
      const pos = opts.auftragPositionen?.find((p) => p.id === posId);
      if (pos?.aenderung_typ === "entfernt") {
        await supabaseAdmin
          .from("auftrag_positionen")
          .delete()
          .eq("id", posId)
          .eq("handwerker_id", opts.handwerkerId);
        continue;
      }

      await supabaseAdmin
        .from("auftrag_positionen")
        .update({
          handwerker_status: "akzeptiert",
          handwerker_angefragt_at: now,
          aenderung_typ: null,
          preis_alt: null,
        })
        .eq("id", posId)
        .eq("handwerker_id", opts.handwerkerId);
    }

    const { data: zuweisungen } = await supabaseAdmin
      .from("auftrag_handwerker")
      .select("id, status")
      .eq("auftrag_id", opts.auftragId)
      .eq("handwerker_id", opts.handwerkerId);

    for (const z of zuweisungen ?? []) {
      const st = String(z.status ?? "").toLowerCase();
      if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
      await supabaseAdmin
        .from("auftrag_handwerker")
        .update({ status: "akzeptiert" })
        .eq("id", z.id);
    }

    if (opts.projektvertragNoetig) {
      const vertragRes = await confirmPartnerProjektvertrag({
        auftragId: opts.auftragId,
        gelesen: opts.gelesen,
        verbindlich: opts.verbindlich,
      });
      if (!vertragRes.ok) return { ok: false, error: vertragRes.error };
    }
  }

  revalidatePath("/partner");
  return { ok: true };
}

/**
 * Ein-Klick-Annahme: Neu oder Ergänzung über angebot_handwerker.
 */
export async function confirmPartnerAuftrag(opts: {
  anfrageId: string;
  gelesen: boolean;
  verbindlich: boolean;
}): Promise<PartnerAuftragBestaetigenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      handwerker_id,
      angebot_id,
      gewerk_id,
      status,
      antwort_at,
      gesendet_at,
      hw_status,
      hw_konditionen,
      bestaetigt_at,
      gewerke(name),
      handwerker(name)
    `
    )
    .eq("id", opts.anfrageId.trim())
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Vorgang nicht gefunden." };
  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const angebotId = String(row.angebot_id ?? "");
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", angebotId)
    .maybeSingle();
  const auftragId = auftrag?.id ? String(auftrag.id) : null;

  const auftragPositionen = auftragId
    ? await loadAuftragPositionen(auftragId, link.handwerkerId)
    : [];
  const alle_hw_konditionen = await loadAlleHwKonditionenForAngebot(
    angebotId,
    link.handwerkerId
  );
  const gewerk = one(row.gewerke) as { name?: string | null } | null;
  const existingHw = parsePartnerHwKonditionen(row.hw_konditionen);

  const nachreichungKontext = {
    crm_auftrag_positionen: auftragPositionen,
    gewerk_id: String(row.gewerk_id ?? ""),
    gewerk_name: gewerk?.name?.trim(),
    handwerker_id: link.handwerkerId,
    hw_konditionen: existingHw,
    hw_status: String(row.hw_status ?? "").toLowerCase(),
    alle_hw_konditionen,
  };

  const isNachreichung = hasPartnerKonditionenNachreichungAusstehend(
    nachreichungKontext
  );

  if (!isNachreichung) {
    if (
      !isPartnerAngebotOffenListItem({
        status: String(row.status ?? ""),
        antwort_at: row.antwort_at as string | null,
        gesendet_at: (row as { gesendet_at?: string | null }).gesendet_at,
        hw_status: (row as { hw_status?: string | null }).hw_status ?? undefined,
        bestaetigt_at: (row as { bestaetigt_at?: string | null }).bestaetigt_at,
        crm_auftrag_positionen: nachreichungKontext.crm_auftrag_positionen,
        gewerk_id: nachreichungKontext.gewerk_id,
        gewerk_name: nachreichungKontext.gewerk_name ?? "Gewerk",
        handwerker_id: nachreichungKontext.handwerker_id,
        hw_konditionen: nachreichungKontext.hw_konditionen,
        alle_hw_konditionen: nachreichungKontext.alle_hw_konditionen,
      })
    ) {
      return { ok: false, error: "Dieser Vorgang kann nicht mehr bestätigt werden." };
    }
    if (!opts.gelesen || !opts.verbindlich) {
      return {
        ok: false,
        error: auftragId
          ? "Bitte Projektvertrag lesen und verbindliche Annahme bestätigen."
          : "Bitte die verbindliche Annahme bestätigen.",
      };
    }
  } else if (!opts.verbindlich) {
    return { ok: false, error: "Bitte die Ergänzung verbindlich bestätigen." };
  }

  const openPositionIds = isNachreichung
    ? resolveNachreichungOpenZeilenIds(nachreichungKontext)
    : auftragPositionen
        .filter((p) => positionBrauchtVorgangAktion(p))
        .map((p) => p.id);

  const openKonditionIds = openPositionIds.filter((id) => {
    const pos = auftragPositionen.find((p) => p.id === id);
    return pos?.aenderung_typ !== "entfernt";
  });

  let built: AcceptKonditionenResult;

  if (auftragPositionen.length && openPositionIds.length) {
    if (openKonditionIds.length) {
      built = buildAcceptKonditionen({
        auftragPositionen,
        openPositionIds: openKonditionIds,
        existingHw: isNachreichung ? existingHw : null,
      });
    } else if (existingHw?.positionen.length) {
      built = {
        ok: true,
        konditionen: existingHw,
        preisNetto: Number((row as { hw_preis_netto?: number | null }).hw_preis_netto ?? 0),
        preisBrutto: Number((row as { hw_preis_brutto?: number | null }).hw_preis_brutto ?? 0),
        openPositionIds,
      };
    } else {
      return { ok: false, error: "Keine offenen Leistungen zum Annehmen." };
    }
  } else if (!auftragPositionen.length) {
    const { data: angebotRow } = await supabaseAdmin
      .from("angebote")
      .select("positionen")
      .eq("id", angebotId)
      .maybeSingle();

    const zeilen = buildPartnerKonditionZeilen(
      (angebotRow as { positionen?: unknown } | null)?.positionen,
      { gewerkId: String(row.gewerk_id ?? ""), handwerkerId: link.handwerkerId }
    );
    const eingabe = buildKonditionenEingabeFromZeilen(zeilen);
    if (!eingabe) {
      return {
        ok: false,
        error: "Für die Leistungen fehlt noch ein Angebotspreis von Bärenwald.",
      };
    }
    const angebotBuilt = buildPartnerHwKonditionenFromEingabe({
      positionenRaw: (angebotRow as { positionen?: unknown } | null)?.positionen,
      gewerkId: String(row.gewerk_id ?? ""),
      eingabe,
    });
    if (!angebotBuilt.ok) return angebotBuilt;
    built = {
      ok: true,
      konditionen: angebotBuilt.konditionen,
      preisNetto: angebotBuilt.preisNetto,
      preisBrutto: angebotBuilt.preisBrutto,
      openPositionIds: [],
    };
  } else {
    return { ok: false, error: "Keine offenen Leistungen zum Annehmen." };
  }

  if (!built.ok) return built;

  const { data: vertragRow } = auftragId
    ? await supabaseAdmin
        .from("auftrag_handwerker")
        .select("projektvertrag_bestaetigt_am")
        .eq("auftrag_id", auftragId)
        .eq("handwerker_id", link.handwerkerId)
        .maybeSingle()
    : { data: null };

  const projektvertragNoetig =
    Boolean(auftragId) &&
    !isNachreichung &&
    !(vertragRow as { projektvertrag_bestaetigt_am?: string | null } | null)
      ?.projektvertrag_bestaetigt_am;

  return persistAcceptance({
    anfrageId: opts.anfrageId.trim(),
    handwerkerId: link.handwerkerId,
    angebotId,
    auftragId,
    konditionen: built.konditionen,
    preisNetto: built.preisNetto,
    preisBrutto: built.preisBrutto,
    openPositionIds: built.openPositionIds,
    auftragPositionen,
    projektvertragNoetig,
    gelesen: opts.gelesen,
    verbindlich: opts.verbindlich,
  });
}

/** Annahme über Auftrags-Zuweisung (ohne parallele angebot_handwerker-Karte). */
export async function confirmPartnerAuftragZuweisung(opts: {
  auftragId: string;
  gelesen: boolean;
  verbindlich: boolean;
}): Promise<PartnerAuftragBestaetigenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }
  if (!opts.gelesen || !opts.verbindlich) {
    return {
      ok: false,
      error: "Bitte Projektvertrag lesen und verbindliche Annahme bestätigen.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const auftragId = opts.auftragId.trim();
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, angebot_id")
    .eq("id", auftragId)
    .maybeSingle();
  if (!auftrag) return { ok: false, error: "Auftrag nicht gefunden." };

  const angebotId = auftrag.angebot_id != null ? String(auftrag.angebot_id) : "";
  if (!angebotId) {
    return { ok: false, error: "Kein verknüpftes Angebot für diesen Auftrag." };
  }

  const synced = await syncAngebotHandwerkerAfterAuftragAccept({
    handwerkerId: link.handwerkerId,
    angebotId,
    auftragId,
  });
  if (!synced.anfrageId) {
    return { ok: false, error: "Zuweisung konnte nicht vorbereitet werden." };
  }

  return confirmPartnerAuftrag({
    anfrageId: synced.anfrageId,
    gelesen: opts.gelesen,
    verbindlich: opts.verbindlich,
  });
}

export async function declinePartnerAnfrage(opts: {
  anfrageId: string;
  grund: string;
  notiz?: string;
}): Promise<PartnerAuftragBestaetigenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const grundRaw = opts.grund?.trim() ?? "";
  if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
    return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      handwerker_id,
      angebot_id,
      handwerker(name),
      gewerke(name)
    `
    )
    .eq("id", opts.anfrageId.trim())
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Vorgang nicht gefunden." };
  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      status: "abgelehnt",
      antwort_at: now,
      antwort_notiz: notiz,
      ablehnung_grund: grundRaw,
      hw_status: null,
    })
    .eq("id", opts.anfrageId.trim())
    .eq("handwerker_id", link.handwerkerId);

  if (upErr) return { ok: false, error: upErr.message };

  const hw = one(row.handwerker) as { name: string } | null;
  const gw = one(row.gewerke) as { name: string } | null;

  await sendPartnerInternalAnfrageAntwortMail({
    handwerkerName: hw?.name?.trim() || "Partner",
    gewerkName: gw?.name?.trim() || "Gewerk",
    angenommen: false,
    ablehnungGrundLabel: HANDWERKER_ABLEHNUNG_GRUND_LABELS[grundRaw],
    notiz,
    angebotId: String(row.angebot_id),
    partnerAngebotPortalUrl: null,
  });

  revalidatePath("/partner");
  return { ok: true };
}

export async function declinePartnerAuftragZuweisung(opts: {
  auftragId: string;
  grund: string;
  notiz?: string;
}): Promise<PartnerAuftragBestaetigenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const grundRaw = opts.grund?.trim() ?? "";
  if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
    return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const auftragId = opts.auftragId.trim();
  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;

  const { data: zuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, status, gewerke(name)")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, handwerker_status, gewerk_name")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  if (!zuweisungen?.length && !positionen?.length) {
    return { ok: false, error: "Keine Zuweisung für diesen Auftrag." };
  }

  for (const z of zuweisungen ?? []) {
    const st = String(z.status ?? "").toLowerCase();
    if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
    await supabaseAdmin
      .from("auftrag_handwerker")
      .update({ status: "abgelehnt" })
      .eq("id", z.id);
  }

  for (const p of positionen ?? []) {
    const st = String(p.handwerker_status ?? "").toLowerCase();
    if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
    await supabaseAdmin
      .from("auftrag_positionen")
      .update({ handwerker_status: "abgelehnt" })
      .eq("id", p.id);
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("angebot_id")
    .eq("id", auftragId)
    .maybeSingle();

  const angebotId = auftrag?.angebot_id != null ? String(auftrag.angebot_id) : "";
  if (angebotId) {
    await supabaseAdmin
      .from("angebot_handwerker")
      .update({
        status: "abgelehnt",
        antwort_at: now,
        antwort_notiz: notiz,
        ablehnung_grund: grundRaw,
        hw_status: null,
      })
      .eq("angebot_id", angebotId)
      .eq("handwerker_id", link.handwerkerId);
  }

  const gewerkName =
    positionen?.[0]?.gewerk_name?.trim() ||
    (one(zuweisungen?.[0]?.gewerke as unknown) as { name?: string } | null)?.name?.trim() ||
    "Gewerk";

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name")
    .eq("id", link.handwerkerId)
    .maybeSingle();

  if (angebotId) {
    await sendPartnerInternalAnfrageAntwortMail({
      handwerkerName: (hw?.name as string)?.trim() || "Partner",
      gewerkName,
      angenommen: false,
      ablehnungGrundLabel: HANDWERKER_ABLEHNUNG_GRUND_LABELS[grundRaw],
      notiz,
      angebotId,
      partnerAngebotPortalUrl: null,
    });
  }

  revalidatePath("/partner");
  return { ok: true };
}
