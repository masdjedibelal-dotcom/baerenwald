import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";

/** Google-Maps-Suche für Partner vor Ort (ohne Kundentelefon). */
export function partnerMapsHref(opts: {
  lead?: PortalAnfrageLeadSource | null;
  plz?: string | null;
  ort?: string | null;
}): string | null {
  const lead = opts.lead;
  const strasse = [lead?.strasse, lead?.hausnummer].filter(Boolean).join(" ").trim();
  const plz = (lead?.plz ?? lead?.objekt?.plz ?? opts.plz ?? "").trim();
  const ort = (lead?.objekt?.ort ?? opts.ort ?? "").trim();
  const ortLine = [plz, ort].filter(Boolean).join(" ").trim();

  const parts = [strasse, ortLine, "Deutschland"].filter(Boolean);
  if (!ortLine && !strasse) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}
