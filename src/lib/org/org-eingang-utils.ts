import type { MeldeKategorie,OrganisationLead } from "@/lib/org/types";

export function meldeFotosFromFunnelDaten(funnel_daten: unknown): string[] {
  const fd = funnel_daten as { fotos?: unknown } | null | undefined;
  if (!Array.isArray(fd?.fotos)) return [];
  return fd.fotos
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, 12);
}

export function meldeFotosFromLead(lead: {
  funnel_daten?: unknown;
}): string[] {
  return meldeFotosFromFunnelDaten(lead.funnel_daten);
}

export function meldeKategorieFromLead(lead: OrganisationLead): MeldeKategorie | null {
  const fd = lead.funnel_daten as { melde_kategorie?: string } | null | undefined;
  const k = fd?.melde_kategorie;
  if (k === "notfall" || k === "schaden" || k === "reparatur" || k === "sonstiges") {
    return k;
  }
  return null;
}
