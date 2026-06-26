import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { formatAnfrageStrasseHausnummer } from "@/lib/portal/portal-anfrage-display";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import {
  portalObjektFromKundenObjekt,
  portalObjektFromLeadPlz,
  portalObjektLeistungsortSection,
  type PortalObjekt,
} from "@/lib/portal/portal-objekt";

type KundenObjektRow = {
  titel?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
};

type PartnerLeistungsortLead = Pick<
  PortalAnfrageLeadSource,
  "plz" | "strasse" | "hausnummer" | "funnel_daten" | "objekt"
>;

/** Objekt + Lead (Funnel/Straße) zu einem vollständigen Leistungsort zusammenführen. */
export function mergePartnerLeistungsort(
  objekt: PortalObjekt | null | undefined,
  lead?: PartnerLeistungsortLead | null,
  fallback?: { kundePlz?: string | null; kundeOrt?: string | null }
): PortalObjekt | null {
  const leadStrasse = lead ? formatAnfrageStrasseHausnummer(lead) : undefined;
  const plz =
    objekt?.plz?.trim() ||
    lead?.plz?.trim() ||
    lead?.objekt?.plz?.trim() ||
    fallback?.kundePlz?.trim() ||
    null;
  const ort =
    objekt?.ort?.trim() ||
    lead?.objekt?.ort?.trim() ||
    fallback?.kundeOrt?.trim() ||
    null;

  if (objekt) {
    return {
      ...objekt,
      strasse: objekt.strasse?.trim() || leadStrasse || null,
      plz: objekt.plz || plz,
      ort: objekt.ort || ort,
    };
  }

  if (leadStrasse || plz || ort) {
    return {
      name: "Leistungsort",
      strasse: leadStrasse ?? null,
      plz,
      ort,
    };
  }

  return portalObjektFromLeadPlz(plz);
}

export function resolvePartnerLeistungsort(opts: {
  objektId?: string | null;
  objektById: Map<string, KundenObjektRow>;
  lead?: PartnerLeistungsortLead | null;
  kundePlz?: string | null;
  kundeOrt?: string | null;
}): PortalObjekt | null {
  const objektId = opts.objektId?.trim();
  let objekt: PortalObjekt | null = null;

  if (objektId) {
    const row = opts.objektById.get(objektId);
    if (row) objekt = portalObjektFromKundenObjekt(row);
  }

  return mergePartnerLeistungsort(objekt, opts.lead, {
    kundePlz: opts.kundePlz,
    kundeOrt: opts.kundeOrt,
  });
}

export function buildPartnerLeistungsortSection(
  objekt: PortalObjekt | null | undefined,
  lead?: PartnerLeistungsortLead | null
): PortalDetailSection | null {
  const merged = mergePartnerLeistungsort(objekt, lead);
  if (!merged) return null;
  const section = portalObjektLeistungsortSection(merged);
  if (!section.rows?.length) return null;
  return section;
}
