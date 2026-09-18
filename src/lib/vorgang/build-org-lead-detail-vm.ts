/**
 * OrganisationLead → VorgangDetailVM (HV-Eingang = gleiche Cards wie Freigabe-Detail).
 */

import { formatPreisspanneDisplay } from "@/lib/org/hv-meldung-workflow";
import { meldeFotosFromLead } from "@/lib/org/org-eingang-utils";
import type { OrganisationLead } from "@/lib/org/types";
import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { labelSituation } from "@/lib/lead-funnel-labels";
import {
  formatAnfrageBereiche,
  formatAnfrageZeitraum,
  resolveAnfrageAdresse,
  resolveAnfrageMelder,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { buildKundeHvVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import type { VorgangDetailVM } from "@/lib/vorgang/vorgang-detail-vm";

function orgLeadToAnfrageSource(lead: OrganisationLead): PortalAnfrageLeadSource {
  const rawObj = lead.objekt as
    | (PortalObjekt & {
        titel?: string;
        adresseZeile?: string;
        plzOrt?: string;
      })
    | null
    | undefined;
  const plzOrt = rawObj?.plzOrt?.trim() || "";
  const plzMatch = plzOrt.match(/^(\d{4,5})\s+(.*)$/);
  const objekt: PortalObjekt | null = rawObj
    ? {
        name:
          rawObj.name?.trim() ||
          rawObj.titel?.trim() ||
          "Objekt",
        strasse:
          rawObj.strasse?.trim() ||
          rawObj.adresseZeile?.trim() ||
          null,
        plz: rawObj.plz?.trim() || plzMatch?.[1] || lead.plz?.trim() || null,
        ort: rawObj.ort?.trim() || plzMatch?.[2]?.trim() || null,
        cover_url: rawObj.cover_url ?? null,
      }
    : null;

  return {
    situation: lead.situation,
    bereiche: lead.bereiche,
    funnel_daten: lead.funnel_daten,
    zeitraum: lead.zeitraum,
    plz: lead.plz,
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    ort: objekt?.ort ?? null,
    melder_name: lead.melder_name,
    melder_einheit: lead.melder_einheit,
    melder_telefon: lead.melder_telefon,
    melder_email: lead.melder_email,
    kontakt_name: lead.kontakt_name,
    kontakt_nachricht: lead.kontakt_nachricht,
    preis_min: lead.preis_min,
    preis_max: lead.preis_max,
    preis_unsicher: lead.preis_unsicher,
    hv_meldung_status: lead.hv_meldung_status,
    objekt,
  };
}

/** Melde-Details für HV-Eingang — gleiche Struktur wie OrganisationHvVorgangDetail. */
export function buildOrgEingangVorgangDetailVm(
  lead: OrganisationLead
): VorgangDetailVM {
  const source = orgLeadToAnfrageSource(lead);
  const addr = resolveAnfrageAdresse(source);
  const melder = resolveAnfrageMelder(source);
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const situationSlug = norm.situation || lead.situation || undefined;
  const situationLabel =
    situationSlug && labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : null;
  const bereichLabel = formatAnfrageBereiche(source) ?? null;
  const zeitraumLabel = formatAnfrageZeitraum(source) ?? null;
  const fachdetails = fachdetailRowsFromFunnelDaten(
    lead.funnel_daten,
    lead.bereiche
  );

  return buildKundeHvVorgangDetailVm({
    role: "hv",
    idLabel: lead.id.slice(0, 8).toUpperCase(),
    titel:
      source.objekt?.name?.trim() ||
      (lead.objekt as { titel?: string } | null)?.titel?.trim() ||
      "Meldung",
    beschreibung: lead.kontakt_nachricht?.trim() || null,
    objekt: source.objekt,
    objektZeile:
      addr.listOrtLine !== "—"
        ? addr.listOrtLine
        : (lead.objekt as { adresseZeile?: string } | null)?.adresseZeile ??
          null,
    melderName: melder.name ?? lead.kontakt_name ?? null,
    einheit: melder.einheit ?? null,
    fotos: meldeFotosFromLead(lead),
    meldeStrasse: addr.strasseZeile ?? null,
    meldePlz: addr.plz ?? null,
    meldeOrt: addr.ort ?? null,
    meldeSituation: situationLabel,
    meldeBereich: bereichLabel,
    meldeZeitraum: zeitraumLabel,
    meldeFachdetails: fachdetails,
    meldePreisIndikation: formatPreisspanneDisplay(
      lead.preis_min,
      lead.preis_max,
      lead.preis_unsicher
    ),
    lead: {
      ...source,
      melder_name: melder.name ?? lead.melder_name,
      melder_einheit: melder.einheit ?? lead.melder_einheit,
      melder_telefon: melder.telefon ?? lead.melder_telefon,
      melder_email: melder.email ?? lead.melder_email,
      strasse: addr.strasse ?? lead.strasse,
      hausnummer: addr.hausnummer ?? lead.hausnummer,
      plz: addr.plz ?? lead.plz,
      ort: addr.ort ?? null,
      kostentraeger: lead.kostentraeger,
      kostentraeger_vorgeschlagen: lead.kostentraeger_vorgeschlagen,
      versicherungs_nr: lead.versicherungs_nr,
      org_freigabe_status: lead.org_freigabe_status,
      hv_meldung_status: lead.hv_meldung_status,
      objekt: source.objekt,
    },
  });
}

/** Melde-Status-Link: gleicher Mieter-Sight wie Portal-Mieter-Modus. */
export function buildMeldeStatusVorgangDetailVm(input: {
  idLabel: string;
  titel: string;
  statusLabel?: string;
  objektTitel: string;
  einheit?: string | null;
  beschreibung?: string | null;
  meldeStrasse?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  meldeFachdetails?: Array<{ label: string; value: string }>;
  fotos?: string[];
}): VorgangDetailVM {
  const objekt: PortalObjekt = {
    name: input.objektTitel,
    strasse: input.meldeStrasse ?? null,
    plz: input.meldePlz ?? null,
    ort: input.meldeOrt ?? null,
  };
  return buildKundeHvVorgangDetailVm({
    role: "mieter",
    idLabel: input.idLabel,
    titel: input.titel,
    statusLabel: input.statusLabel,
    beschreibung: input.beschreibung ?? null,
    objekt,
    einheit: input.einheit ?? null,
    melderName: null,
    fotos: input.fotos ?? [],
    meldeStrasse: input.meldeStrasse ?? null,
    meldePlz: input.meldePlz ?? null,
    meldeOrt: input.meldeOrt ?? null,
    meldeSituation: input.meldeSituation ?? null,
    meldeBereich: input.meldeBereich ?? null,
    meldeZeitraum: input.meldeZeitraum ?? null,
    meldeFachdetails: input.meldeFachdetails ?? [],
  });
}
