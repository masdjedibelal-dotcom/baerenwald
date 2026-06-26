import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { resolvePartnerLeistungsort } from "@/lib/partner/partner-portal-objekt";

export type PartnerLeadDbRow = {
  situation?: string | null;
  bereiche?: string[] | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  zeitraum?: string | null;
  preis_min?: number | null;
  preis_max?: number | null;
  budget_ca?: number | null;
  kontakt_nachricht?: string | null;
  funnel_daten?: unknown;
  kunde_objekt_id?: string | null;
  auftraggeber_kunde_id?: string | null;
  org_freigabe_status?: string | null;
  kontakt_name?: string | null;
};

export type PartnerKundenObjektRow = {
  titel?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
};

export function buildPartnerLeadSource(opts: {
  lead?: PartnerLeadDbRow | null;
  angebotObjektId?: string | null;
  kundePlz?: string | null;
  kundeOrt?: string | null;
  objektById: Map<string, PartnerKundenObjektRow>;
}): PortalAnfrageLeadSource | null {
  const lead = opts.lead;
  const objektId =
    lead?.kunde_objekt_id?.trim() || opts.angebotObjektId?.trim() || null;

  const objekt = resolvePartnerLeistungsort({
    objektId,
    objektById: opts.objektById,
    lead,
    kundePlz: opts.kundePlz,
    kundeOrt: opts.kundeOrt,
  });

  if (!lead && !objekt) return null;

  if (!lead) {
    return {
      plz: objekt?.plz ?? opts.kundePlz ?? null,
      objekt,
    };
  }

  return {
    situation: lead.situation,
    bereiche: lead.bereiche,
    plz: lead.plz ?? objekt?.plz ?? opts.kundePlz ?? null,
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    zeitraum: lead.zeitraum,
    preis_min: lead.preis_min,
    preis_max: lead.preis_max,
    budget_ca: lead.budget_ca,
    kontakt_nachricht: lead.kontakt_nachricht,
    funnel_daten: lead.funnel_daten,
    objekt,
  };
}

export function collectPartnerObjektIds(
  ...sources: Array<string | null | undefined>
): string[] {
  const ids = new Set<string>();
  for (const id of sources) {
    const t = id?.trim();
    if (t) ids.add(t);
  }
  return Array.from(ids);
}
