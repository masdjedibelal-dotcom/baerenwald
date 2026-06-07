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

export function resolvePartnerLeistungsort(opts: {
  objektId?: string | null;
  objektById: Map<string, KundenObjektRow>;
  lead?: Pick<
    PortalAnfrageLeadSource,
    "plz" | "strasse" | "hausnummer"
  > | null;
  kundePlz?: string | null;
  kundeOrt?: string | null;
}): PortalObjekt | null {
  const objektId = opts.objektId?.trim();
  if (objektId) {
    const row = opts.objektById.get(objektId);
    if (row) return portalObjektFromKundenObjekt(row);
  }

  const strasse = opts.lead ? formatAnfrageStrasseHausnummer(opts.lead) : undefined;
  const plz = opts.lead?.plz?.trim() || opts.kundePlz?.trim() || null;
  const ort = opts.kundeOrt?.trim() || null;

  if (strasse || plz || ort) {
    return {
      name: "Leistungsort",
      strasse: strasse ?? null,
      plz,
      ort,
    };
  }

  return portalObjektFromLeadPlz(plz);
}

export function buildPartnerLeistungsortSection(
  objekt: PortalObjekt | null | undefined
): PortalDetailSection | null {
  if (!objekt) return null;
  const section = portalObjektLeistungsortSection(objekt);
  if (!section.rows?.length) return null;
  return section;
}
