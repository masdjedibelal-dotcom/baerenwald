/**
 * OrganisationLead → VorgangDetailVM (HV-Eingang = gleiche Cards wie Freigabe-Detail).
 */

import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { buildKundeHvVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import type { VorgangDetailVM } from "@/lib/vorgang/vorgang-detail-vm";

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
