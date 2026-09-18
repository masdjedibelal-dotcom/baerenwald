import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";

type LeadLike = Record<string, unknown> & { id: string };
type AngebotLike = Record<string, unknown> & { id: string };
type AuftragLike = Record<string, unknown> & { id: string };

/** Funnel nur mit Titel-/Status-relevanten Feldern (ohne Fotos/Rohpayload). */
export function slimFunnelForList(funnel: unknown): Record<string, unknown> | null {
  if (!funnel || typeof funnel !== "object" || Array.isArray(funnel)) return null;
  const f = funnel as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of [
    "ort",
    "strasse",
    "hausnummer",
    "plz",
    "mieter",
    "ohne_mieter",
    "answers",
    "antworten",
    "situation",
    "bereiche",
    "zeitraum",
    "dringlichkeit",
    "kundentyp",
    "zugaenglichkeit",
    "groesse",
    "groesseEinheit",
    "badAusstattung",
    "breakdown",
    "freitext",
    "leadBeschreibung",
    /** Melde-Titel (Startseite/Liste) braucht Bereich + Fachantworten */
    "melde_bereich",
    "melde_kategorie",
    "fachdetailAnswers",
    "kategorie",
    "notfall",
    "havarie",
    "als_akut",
    "quelle",
  ]) {
    if (f[key] !== undefined) out[key] = f[key];
  }
  // Nested: fachdetails inkl. Answers + verschachtelte Gewerk-States
  const fd = f.fachdetails;
  if (fd && typeof fd === "object" && !Array.isArray(fd)) {
    const nested = fd as Record<string, unknown>;
    const answers = nested.fachdetailAnswers;
    const slimFd: Record<string, unknown> = {};
    if (answers && typeof answers === "object") {
      slimFd.fachdetailAnswers = answers;
      if (out.fachdetailAnswers === undefined) out.fachdetailAnswers = answers;
    }
    for (const k of [
      "sanitaer",
      "maler",
      "heizung",
      "elektro",
      "boden",
      "dach",
      "garten",
      "fassade",
      "fenster",
    ]) {
      if (nested[k] != null) slimFd[k] = nested[k];
    }
    if (Object.keys(slimFd).length) out.fachdetails = slimFd;
  }
  return Object.keys(out).length ? out : null;
}

function slimLead(l: LeadLike): LeadLike {
  const {
    dokumente: _d,
    ...rest
  } = l;
  return {
    ...rest,
    funnel_daten: slimFunnelForList(l.funnel_daten),
    dokumente: [],
  };
}

function slimAngebot(a: AngebotLike): AngebotLike {
  const docs = Array.isArray(a.dokumente) ? a.dokumente : [];
  const angebotDocs = docs.filter((d) => {
    const art = String((d as { art?: string }).art ?? "").toLowerCase();
    return art === "angebot" || Boolean((d as { href?: string }).href);
  });
  return {
    ...a,
    // Roh-JSON nicht in die Client-Hydration schicken — Display behalten.
    positionen: undefined,
    positionenDisplay: Array.isArray(a.positionenDisplay)
      ? a.positionenDisplay
      : [],
    leistungsumfang: a.leistungsumfang ?? null,
    notizen: null,
    dokumente: angebotDocs,
  };
}

function slimAuftrag(a: AuftragLike): AuftragLike {
  const pos = Array.isArray(a.positionen) ? a.positionen : [];
  return {
    ...a,
    positionen: pos.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        id: row.id,
        handwerker_id: row.handwerker_id ?? null,
        handwerker_status: row.handwerker_status ?? null,
        leistung_status: row.leistung_status ?? null,
        aenderung_typ: row.aenderung_typ ?? null,
        kunde_akzeptiert_at: row.kunde_akzeptiert_at ?? null,
        gewerk_name: row.gewerk_name ?? null,
        leistung_name: row.leistung_name ?? null,
      };
    }),
    bautagebuch: [],
    milestones: [],
    rechnungen: [],
    dokumente: [],
    angebotPositionenRaw: undefined,
  };
}

/** Listenkarte: ohne Medien/schwere Detailblöcke (Detail via API). */
export function slimVorgangListItem(
  item: KundePortalDetailItem
): KundePortalDetailItem {
  const docs = Array.isArray(item.dokumente) ? item.dokumente : [];
  const angebotDocs = docs.filter((d) => {
    const art = String((d as { art?: string }).art ?? "").toLowerCase();
    const name = String((d as { name?: string }).name ?? "").toLowerCase();
    return art === "angebot" || name.includes("angebot");
  });
  return {
    ...item,
    meldeFotos: [],
    bautagebuch: [],
    // Angebot-PDF + Leistungen müssen in der Liste/Detail-Fallback sichtbar bleiben.
    dokumente: angebotDocs,
    angebotPositionen: item.angebotPositionen,
    auftragPositionen: undefined,
    abnahmeCheckliste: null,
    meldeFachdetails: undefined,
    meldeFachdetailAnswers: undefined,
    meldeUrsachenCheck: undefined,
    sections: item.sections ?? [],
  };
}

export function buildSlimPortalListPayload(opts: {
  leads: LeadLike[];
  angebote: AngebotLike[];
  auftraege: AuftragLike[];
  hvPortalMode?: boolean;
  mieterStatusMode?: boolean;
  mieterFeedbackByLeadId?: Record<
    string,
    { sterne: number; freitext?: string | null }
  >;
}) {
  /**
   * Titel zuerst aus vollem Funnel (z. B. „Wasser am Heizkörper“),
   * danach Payload slimmen — sonst weichen Liste und Detail auseinander.
   */
  const initialVorgaenge = buildKundeVorgaenge({
    leads: opts.leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
    angebote: opts.angebote as Parameters<
      typeof buildKundeVorgaenge
    >[0]["angebote"],
    auftraege: opts.auftraege as Parameters<
      typeof buildKundeVorgaenge
    >[0]["auftraege"],
    hvPortalMode: opts.hvPortalMode,
    mieterStatusMode: opts.mieterStatusMode,
    mieterFeedbackByLeadId: opts.mieterFeedbackByLeadId,
  }).map(slimVorgangListItem);

  const leads = opts.leads.map(slimLead);
  const angebote = opts.angebote.map(slimAngebot);
  const auftraege = opts.auftraege.map(slimAuftrag);

  return { leads, angebote, auftraege, initialVorgaenge };
}
