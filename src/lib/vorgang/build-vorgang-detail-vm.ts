/**
 * Mapper → VorgangDetailVM (HV / Kunde / Partner / Mieter).
 */

import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalAuftragPositionDisplay } from "@/lib/portal/kunde-auftrag-aenderung";
import type { PartnerKonditionZeile } from "@/lib/partner/partner-konditionen";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import {
  kostentraegerLabel,
  type VorgangDetailAusfuehrung,
  type VorgangDetailKopf,
  type VorgangDetailObjektMelder,
  type VorgangDetailRole,
  type VorgangDetailVM,
  type VorgangLeistungZeile,
} from "@/lib/vorgang/vorgang-detail-vm";

function formatAdresse(
  objekt?: PortalObjekt | null,
  lead?: {
    strasse?: string | null;
    hausnummer?: string | null;
    plz?: string | null;
    ort?: string | null;
  } | null
): string | null {
  const strasse =
    objekt?.strasse?.trim() ||
    [lead?.strasse, lead?.hausnummer].filter(Boolean).join(" ").trim();
  const plzOrt =
    [objekt?.plz ?? lead?.plz, objekt?.ort ?? lead?.ort]
      .filter(Boolean)
      .join(" ")
      .trim() || "";
  const line = [strasse, plzOrt].filter(Boolean).join(", ");
  return line || null;
}

function leistungenFromAngebotDisplay(
  items: PortalAngebotPositionDisplay[] | undefined
): VorgangLeistungZeile[] {
  if (!items?.length) return [];
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    beschreibung: p.beschreibung,
    preisBrutto: p.preisBrutto,
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
    preisBrutto: p.preisBrutto,
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
  role: "hv" | "kunde";
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
  const adresseFromLead = formatAdresse(input.objekt ?? lead?.objekt, {
    strasse: input.meldeStrasse
      ? input.meldeStrasse
      : lead?.strasse,
    hausnummer: input.meldeStrasse ? null : lead?.hausnummer,
    plz: input.meldePlz ?? lead?.plz,
    ort: input.meldeOrt ?? lead?.ort,
  });
  const adresse =
    adresseFromLead ||
    input.meldeStrasse?.trim() ||
    input.objektZeile?.trim() ||
    null;

  const adresseStrasse =
    input.meldeStrasse?.trim() ||
    [lead?.strasse, lead?.hausnummer].filter(Boolean).join(" ").trim() ||
    input.objekt?.strasse?.trim() ||
    lead?.objekt?.strasse?.trim() ||
    null;

  const plzOrt =
    [input.meldePlz ?? lead?.plz ?? input.objekt?.plz ?? lead?.objekt?.plz,
      input.meldeOrt ?? lead?.ort ?? input.objekt?.ort ?? lead?.objekt?.ort]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

  const leistungen =
    leistungenFromAuftragDisplay(input.auftragPositionen).length > 0
      ? leistungenFromAuftragDisplay(input.auftragPositionen)
      : leistungenFromAngebotDisplay(input.angebotPositionen);

  const kopf: VorgangDetailKopf = {
    idLabel: input.idLabel,
    titel: input.titel,
    statusLabel: input.statusLabel,
    notfall: input.notfall,
    kategorie: input.kategorie,
  };

  const objektMelder: VorgangDetailObjektMelder = {
    objektTitel: input.objekt?.name ?? lead?.objekt?.name ?? null,
    adresseZeile: adresse,
    adresseStrasse,
    plzOrt,
    einheit: input.einheit ?? lead?.melder_einheit ?? null,
    zugangshinweis: input.lead?.einheiten_hinweis ?? null,
    melderName:
      input.melderName ?? lead?.melder_name ?? lead?.kontakt_name ?? null,
    melderTelefon: lead?.melder_telefon ?? null,
    melderEmail: lead?.melder_email ?? null,
    beschreibung: input.beschreibung ?? null,
    fotos: input.fotos ?? [],
    situationLabel: input.meldeSituation ?? null,
    bereichLabel: input.meldeBereich ?? null,
    zeitraumLabel: input.meldeZeitraum ?? null,
  };

  const ausfuehrung: VorgangDetailAusfuehrung = {
    gewerk: input.kategorie ?? null,
    handwerkerName: input.handwerkerName ?? null,
    terminVon: input.terminVon ?? null,
    terminBis: input.terminBis ?? null,
    terminLabel:
      input.terminVon || input.terminBis
        ? [input.terminVon, input.terminBis].filter(Boolean).join(" – ")
        : null,
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
};

export function buildPartnerVorgangDetailVm(
  input: BuildPartnerVmInput
): VorgangDetailVM {
  const lead = input.lead;
  const adresse =
    formatAdresse(lead?.objekt, {
      strasse: lead?.strasse,
      hausnummer: lead?.hausnummer,
      plz: lead?.plz ?? input.plz,
      ort: lead?.ort ?? input.ort,
    }) ||
    [input.plz, input.ort].filter(Boolean).join(" ") ||
    null;

  const leistungen = leistungenFromPartnerKonditionen(input.konditionZeilen);
  const summeEk = leistungen.reduce(
    (acc, z) => acc + (typeof z.preisEkNetto === "number" ? z.preisEkNetto : 0),
    0
  );

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
      objektTitel: lead?.objekt?.name ?? null,
      adresseZeile: adresse,
      einheit: lead?.melder_einheit ?? null,
      melderName: lead?.melder_name ?? lead?.kontakt_name ?? null,
      melderTelefon: lead?.melder_telefon ?? null,
      melderEmail: lead?.melder_email ?? null,
      beschreibung: lead?.kontakt_nachricht ?? null,
      fotos: input.fotos ?? [],
    },
    ausfuehrung: {
      gewerk: input.gewerkName ?? null,
      aufgabeNotiz: input.aufgabeNotiz ?? null,
      terminVon: input.startDatum ?? null,
      terminBis: input.endDatum ?? null,
      terminLabel:
        input.zeitraum?.trim() ||
        ([input.startDatum, input.endDatum].filter(Boolean).join(" – ") ||
          null),
      kontaktVorOrtName: lead?.melder_name ?? lead?.kontakt_name ?? null,
      kontaktVorOrtTel: lead?.melder_telefon ?? null,
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
  };
}
