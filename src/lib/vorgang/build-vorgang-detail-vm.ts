/**
 * Mapper → VorgangDetailVM (HV / Kunde / Partner / Mieter).
 */

import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalAuftragPositionDisplay } from "@/lib/portal/kunde-auftrag-aenderung";
import type { PartnerKonditionZeile } from "@/lib/partner/partner-konditionen";
import {
  formatAnfrageBereiche,
  formatAnfrageZeitraum,
  resolveAnfrageAdresse,
  resolveAnfrageMelder,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import { labelSituation } from "@/lib/lead-funnel-labels";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { formatAuftragDatumSpan } from "@/lib/portal/portal-auftrag-display";
import {
  kostentraegerLabel,
  type VorgangDetailAusfuehrung,
  type VorgangDetailKopf,
  type VorgangDetailObjektMelder,
  type VorgangDetailRole,
  type VorgangDetailsLeistungen,
  type VorgangDetailVM,
  type VorgangLeistungZeile,
} from "@/lib/vorgang/vorgang-detail-vm";

/** Portal-Flow grob für Details-Card (Preisindikation vs. Leistungen). */
export type VorgangDetailPortalFlow =
  | "gemeldet"
  | "freigegeben"
  | "angefragt"
  | "angebot"
  | "auftrag"
  | "abschluss"
  | "rechnung"
  | "bezahlt"
  | "abgelehnt";

const FLOW_RECHNUNG = new Set<VorgangDetailPortalFlow>([
  "abschluss",
  "rechnung",
  "bezahlt",
]);

const FLOW_PAST_ANFRAGE = new Set<VorgangDetailPortalFlow>([
  "angebot",
  "auftrag",
  "abschluss",
  "rechnung",
  "bezahlt",
  "abgelehnt",
]);

function resolveDetailsLeistungen(opts: {
  role: VorgangDetailRole;
  flow: VorgangDetailPortalFlow | null | undefined;
  hasLeistungen: boolean;
}): VorgangDetailsLeistungen | null {
  if (!opts.hasLeistungen) return null;
  const flow = opts.flow;

  if (opts.role === "mieter") {
    return { title: "Leistungen", mode: "plain" };
  }
  if (flow && FLOW_RECHNUNG.has(flow)) {
    return { title: "Rechnung", mode: "vk" };
  }
  if (flow === "auftrag") {
    return { title: "Leistungen", mode: "vk" };
  }
  return { title: "Angebot", mode: "vk" };
}

function leistungenFromAngebotDisplay(
  items: PortalAngebotPositionDisplay[] | undefined
): VorgangLeistungZeile[] {
  if (!items?.length) return [];
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    beschreibung: p.beschreibung,
    gewerk: p.gewerk,
    menge: p.mengeLabel ?? (p.menge != null ? String(p.menge) : undefined),
    einheit: p.mengeLabel ? undefined : p.einheit,
    preisBrutto: p.preisBrutto > 0 ? p.preisBrutto : null,
  }));
}

function leistungenFromAuftragDisplay(
  items: PortalAuftragPositionDisplay[] | undefined
): VorgangLeistungZeile[] {
  if (!items?.length) return [];
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    beschreibung: p.beschreibung,
    gewerk: p.gewerk,
    menge: p.mengeLabel ?? (p.menge != null ? String(p.menge) : undefined),
    einheit: p.mengeLabel ? undefined : p.einheit,
    preisBrutto: p.preisBrutto > 0 ? p.preisBrutto : null,
    aenderungBadge: p.aenderungBadge,
  }));
}

function leistungenFromPartnerKonditionen(
  zeilen: PartnerKonditionZeile[] | undefined
): VorgangLeistungZeile[] {
  if (!zeilen?.length) return [];
  return zeilen.map((z) => ({
    id: z.id,
    title: z.title,
    beschreibung: z.beschreibung,
    preisEkNetto: z.vorschlagNetto ?? z.hwNetto ?? null,
    aenderungBadge:
      z.zeilenBadge === "vereinbart" ? undefined : z.zeilenBadge,
  }));
}

export type BuildKundeHvVmInput = {
  role: "hv" | "kunde" | "mieter" | "hausmeister";
  idLabel: string;
  titel: string;
  statusLabel?: string;
  notfall?: boolean;
  kategorie?: string;
  beschreibung?: string | null;
  objektZeile?: string | null;
  objekt?: PortalObjekt | null;
  lead?: PortalAnfrageLeadSource & {
    melder_telefon?: string | null;
    melder_email?: string | null;
    kostentraeger?: string | null;
    kostentraeger_vorgeschlagen?: boolean | null;
    versicherungs_nr?: string | null;
    hv_meldung_status?: string | null;
    org_freigabe_status?: string | null;
    einheiten_hinweis?: string | null;
  } | null;
  melderName?: string | null;
  einheit?: string | null;
  fotos?: string[];
  meldeStrasse?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  meldeFachdetails?: Array<{ label: string; value: string }>;
  /** Unverbindliche Preisindikation aus Meldung — nur bei role=hv in Anfrage-Phase */
  meldePreisIndikation?: string | null;
  /** Aktueller Portal-Flow (steuert Preisindikation / Angebots- vs. Rechnungs-Block) */
  portalFlow?: VorgangDetailPortalFlow | null;
  angebotPositionen?: PortalAngebotPositionDisplay[];
  auftragPositionen?: PortalAuftragPositionDisplay[];
  gesamtBrutto?: number | null;
  handwerkerName?: string | null;
  terminVon?: string | null;
  terminBis?: string | null;
  rechnungsempfaengerHint?: string | null;
};

export function buildKundeHvVorgangDetailVm(
  input: BuildKundeHvVmInput
): VorgangDetailVM {
  const lead = input.lead;
  const addr = resolveAnfrageAdresse({
    ...(lead ?? {}),
    strasse: input.meldeStrasse ? undefined : lead?.strasse,
    hausnummer: input.meldeStrasse ? undefined : lead?.hausnummer,
    plz: input.meldePlz ?? lead?.plz,
    ort: input.meldeOrt ?? lead?.ort,
    objekt: input.objekt ?? lead?.objekt,
    funnel_daten: lead?.funnel_daten,
  });
  const melder = resolveAnfrageMelder(lead ?? {});

  const adresseStrasse =
    input.meldeStrasse?.trim() ||
    addr.strasseZeile ||
    null;

  const plzOrt =
    [input.meldePlz ?? addr.plz, input.meldeOrt ?? addr.ort]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  const adresse =
    [adresseStrasse, plzOrt].filter(Boolean).join(", ") ||
    (addr.listOrtLine !== "—" ? addr.listOrtLine : null) ||
    input.objektZeile?.trim() ||
    null;

  const flow = input.portalFlow ?? null;
  const angebotLeistungen = leistungenFromAngebotDisplay(input.angebotPositionen);
  const auftragLeistungen = leistungenFromAuftragDisplay(input.auftragPositionen);
  const preferAuftrag =
    flow != null &&
    (FLOW_RECHNUNG.has(flow) || flow === "auftrag") &&
    auftragLeistungen.length > 0;
  const leistungen = preferAuftrag
    ? auftragLeistungen
    : angebotLeistungen.length > 0
      ? angebotLeistungen
      : auftragLeistungen;

  const pastAnfrage =
    (flow != null && FLOW_PAST_ANFRAGE.has(flow)) || leistungen.length > 0;
  const detailsLeistungen = resolveDetailsLeistungen({
    role: input.role,
    flow,
    hasLeistungen: leistungen.length > 0,
  });

  const funnelRows =
    input.meldeFachdetails && input.meldeFachdetails.length > 0
      ? input.meldeFachdetails
      : lead?.funnel_daten
        ? fachdetailRowsFromFunnelDaten(lead.funnel_daten, lead.bereiche)
        : [];

  const situationFromLead = (() => {
    if (input.meldeSituation?.trim()) return input.meldeSituation.trim();
    if (!lead) return null;
    const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
    const slug = norm.situation || lead.situation;
    if (!slug) return null;
    const l = labelSituation(slug);
    return l && l !== "—" ? l : null;
  })();

  const bereichFromLead =
    input.meldeBereich?.trim() ||
    (lead ? formatAnfrageBereiche(lead) : null) ||
    null;

  const zeitraumFromLead =
    input.meldeZeitraum?.trim() ||
    (lead ? formatAnfrageZeitraum(lead) : null) ||
    null;

  const kopf: VorgangDetailKopf = {
    idLabel: input.idLabel,
    titel: input.titel,
    statusLabel: input.statusLabel,
    notfall: input.notfall,
    kategorie: input.kategorie,
  };

  const melderName =
    input.melderName ?? melder.name ?? lead?.kontakt_name ?? null;

  const objektMelder: VorgangDetailObjektMelder = {
    objektTitel:
      input.objekt?.name ??
      lead?.objekt?.name ??
      (lead?.objekt as { titel?: string } | null | undefined)?.titel ??
      null,
    adresseZeile: adresse,
    adresseStrasse,
    plzOrt,
    einheit: input.einheit ?? melder.einheit ?? lead?.melder_einheit ?? null,
    zugangshinweis: input.lead?.einheiten_hinweis ?? null,
    melderName,
    melderTelefon: melder.telefon ?? lead?.melder_telefon ?? null,
    melderEmail: melder.email ?? lead?.melder_email ?? null,
    beschreibung: input.beschreibung ?? null,
    fotos: input.fotos ?? [],
    situationLabel: situationFromLead,
    bereichLabel: bereichFromLead,
    zeitraumLabel: zeitraumFromLead,
    fachdetailRows: funnelRows,
    preisIndikation:
      input.role === "hv" && !pastAnfrage
        ? input.meldePreisIndikation?.trim() || null
        : null,
  };

  const terminLabel =
    formatAuftragDatumSpan(input.terminVon, input.terminBis) ?? null;

  const ausfuehrung: VorgangDetailAusfuehrung = {
    gewerk: input.kategorie ?? null,
    handwerkerName: input.handwerkerName ?? null,
    terminVon: input.terminVon ?? null,
    terminBis: input.terminBis ?? null,
    terminLabel,
    kontaktVorOrtName: objektMelder.melderName,
    kontaktVorOrtTel: objektMelder.melderTelefon,
  };

  return {
    role: input.role,
    kopf,
    auftraggeber: {
      kostentraeger: kostentraegerLabel(lead?.kostentraeger),
      kostentraegerVorgeschlagen: Boolean(lead?.kostentraeger_vorgeschlagen),
      versicherungsNr: lead?.versicherungs_nr ?? null,
      freigabeStatus: lead?.org_freigabe_status ?? null,
      hvMeldungStatus: lead?.hv_meldung_status ?? null,
      summeBrutto: input.gesamtBrutto ?? null,
      rechnungsempfaengerHint: input.rechnungsempfaengerHint ?? null,
    },
    objektMelder,
    ausfuehrung,
    leistungen,
    detailsLeistungen,
  };
}

export type BuildPartnerVmInput = {
  idLabel: string;
  titel: string;
  statusLabel?: string;
  lead?: PortalAnfrageLeadSource | null;
  plz?: string;
  ort?: string;
  zeitraum?: string;
  aufgabeNotiz?: string | null;
  gewerkName?: string | null;
  konditionZeilen?: PartnerKonditionZeile[];
  startDatum?: string | null;
  endDatum?: string | null;
  fotos?: string[];
  /**
   * Preisanfrage (LV-Einholung): kein Melder/Zugang/Dringlichkeit —
   * nur Ort + kurze Beschreibung + optional CRM-Text.
   */
  variant?: "default" | "einholung";
  /** Überschreibt Melde-Beschreibung (z. B. CRM-Projektbeschreibung). */
  beschreibungPlain?: string | null;
};

export function buildPartnerVorgangDetailVm(
  input: BuildPartnerVmInput
): VorgangDetailVM {
  const einholung = input.variant === "einholung";
  const lead = input.lead;
  const addr = resolveAnfrageAdresse({
    ...(lead ?? {}),
    plz: lead?.plz ?? input.plz,
    ort: lead?.ort ?? input.ort,
  });
  const melder = resolveAnfrageMelder(lead ?? {});
  const strasse = addr.strasseZeile || null;
  const plzOrt =
    [addr.plz ?? input.plz, addr.ort ?? input.ort]
      .filter(Boolean)
      .join(" ")
      .trim() || null;
  const adresse =
    (addr.listOrtLine !== "—" ? addr.listOrtLine : null) ||
    [input.plz, input.ort].filter(Boolean).join(" ") ||
    null;

  const leistungen = leistungenFromPartnerKonditionen(input.konditionZeilen);
  const summeEk = leistungen.reduce(
    (acc, z) => acc + (typeof z.preisEkNetto === "number" ? z.preisEkNetto : 0),
    0
  );

  const norm = lead
    ? normalizeFunnelDaten(lead.funnel_daten, lead.bereiche)
    : null;
  const situationSlug = norm?.situation || lead?.situation || undefined;
  const situationLabel =
    !einholung &&
    situationSlug &&
    labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : null;
  const bereichLabel = lead ? formatAnfrageBereiche(lead) ?? null : null;
  const fachdetailRows =
    !einholung && lead?.funnel_daten
      ? fachdetailRowsFromFunnelDaten(lead.funnel_daten, lead.bereiche)
      : [];
  const zeitraumLabel = einholung
    ? null
    : input.zeitraum?.trim() ||
      (lead ? formatAnfrageZeitraum(lead) : null) ||
      null;

  const beschreibung = einholung
    ? input.beschreibungPlain?.trim() || null
    : input.beschreibungPlain?.trim() ||
      lead?.kontakt_nachricht?.trim() ||
      null;

  return {
    role: "partner",
    kopf: {
      idLabel: input.idLabel,
      titel: input.titel,
      statusLabel: input.statusLabel,
      kategorie: input.gewerkName ?? undefined,
    },
    auftraggeber: {},
    objektMelder: {
      objektTitel: lead?.objekt?.name?.trim() || strasse || null,
      adresseZeile: adresse,
      adresseStrasse: strasse,
      plzOrt,
      einheit: melder.einheit ?? lead?.melder_einheit ?? null,
      zugangshinweis: einholung ? null : (lead?.einheiten_hinweis ?? null),
      melderName: einholung ? null : (melder.name ?? lead?.kontakt_name ?? null),
      melderTelefon: einholung
        ? null
        : (melder.telefon ?? lead?.melder_telefon ?? null),
      melderEmail: einholung ? null : (melder.email ?? null),
      beschreibung,
      fotos: input.fotos ?? [],
      situationLabel,
      bereichLabel,
      zeitraumLabel,
      fachdetailRows,
    },
    ausfuehrung: {
      gewerk: input.gewerkName ?? null,
      aufgabeNotiz: einholung ? null : (input.aufgabeNotiz ?? null),
      terminVon: einholung ? null : (input.startDatum ?? null),
      terminBis: einholung ? null : (input.endDatum ?? null),
      terminLabel: einholung
        ? null
        : zeitraumLabel ||
          formatAuftragDatumSpan(input.startDatum, input.endDatum) ||
          null,
      kontaktVorOrtName: einholung
        ? null
        : (melder.name ?? lead?.kontakt_name ?? null),
      kontaktVorOrtTel: einholung
        ? null
        : (melder.telefon ?? lead?.melder_telefon ?? null),
      summeEkNetto: summeEk > 0 ? summeEk : null,
    },
    leistungen,
  };
}

export type BuildMieterVmInput = {
  idLabel: string;
  titel: string;
  statusLabel?: string;
  objektTitel: string;
  einheit?: string | null;
  melderName?: string | null;
  beschreibungPlain?: string | null;
  leistungstitel?: string[];
};

export function buildMieterVorgangDetailVm(
  input: BuildMieterVmInput
): VorgangDetailVM {
  const leistungen: VorgangLeistungZeile[] = (input.leistungstitel ?? []).map(
    (t, i) => ({
      id: `mieter-leist-${i}`,
      title: t,
    })
  );

  return {
    role: "mieter",
    kopf: {
      idLabel: input.idLabel,
      titel: input.titel,
      statusLabel: input.statusLabel,
    },
    auftraggeber: {},
    objektMelder: {
      objektTitel: input.objektTitel,
      einheit: input.einheit ?? null,
      melderName: input.melderName ?? null,
      beschreibung: input.beschreibungPlain ?? null,
      fotos: [],
    },
    ausfuehrung: {
      kontaktVorOrtName: null,
    },
    leistungen,
    detailsLeistungen:
      leistungen.length > 0
        ? { title: "Leistungen", mode: "plain" as const }
        : null,
  };
}

export function emptyVorgangDetailVm(
  role: VorgangDetailRole,
  titel = "Vorgang"
): VorgangDetailVM {
  return {
    role,
    kopf: { idLabel: "—", titel },
    auftraggeber: {},
    objektMelder: {},
    ausfuehrung: {},
    leistungen: [],
    detailsLeistungen: null,
  };
}
