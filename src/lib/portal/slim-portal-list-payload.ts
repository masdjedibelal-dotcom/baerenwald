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
    "answers",
    "antworten",
    /** Melde-Titel (Startseite/Liste) braucht Bereich + Fachantworten */
    "melde_bereich",
    "melde_kategorie",
    "fachdetailAnswers",
    "kategorie",
    "notfall",
    "havarie",
    "als_akut",
    "dringlichkeit",
    "quelle",
    "bereiche",
  ]) {
    if (f[key] !== undefined) out[key] = f[key];
  }
  // Nested: nur Answers, keine Fotos/Rohpayload
  const fd = f.fachdetails;
  if (fd && typeof fd === "object" && !Array.isArray(fd)) {
    const answers = (fd as { fachdetailAnswers?: unknown }).fachdetailAnswers;
    if (answers && typeof answers === "object") {
      out.fachdetails = { fachdetailAnswers: answers };
    }
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
  return {
    ...a,
    positionen: undefined,
    positionenDisplay: [],
    leistungsumfang: null,
    notizen: null,
    dokumente: [],
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
  return {
    ...item,
    meldeFotos: [],
    bautagebuch: [],
    dokumente: [],
    angebotPositionen: undefined,
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
  const leads = opts.leads.map(slimLead);
  const angebote = opts.angebote.map(slimAngebot);
  const auftraege = opts.auftraege.map(slimAuftrag);

  const initialVorgaenge = buildKundeVorgaenge({
    leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
    angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
    auftraege: auftraege as Parameters<typeof buildKundeVorgaenge>[0]["auftraege"],
    hvPortalMode: opts.hvPortalMode,
    mieterStatusMode: opts.mieterStatusMode,
    mieterFeedbackByLeadId: opts.mieterFeedbackByLeadId,
  }).map(slimVorgangListItem);

  return { leads, angebote, auftraege, initialVorgaenge };
}
