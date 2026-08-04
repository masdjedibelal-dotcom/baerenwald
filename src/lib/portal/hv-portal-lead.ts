/** Kanäle für Vorgänge über Hausverwaltung (Mieter-Meldung etc.). */
export const HV_PORTAL_KANALE = new Set([
  "hv_melder_link",
  "hv_direkt",
  "hv_einladung",
  "hv_manuell",
  "hv_katalog",
]);

/** Mieter-/Endkunden-Portal: HV-Vorgang (Preise/Leistungen/Angebot ausblenden). */
export function isHvPortalLead(lead: {
  auftraggeber_kunde_id?: string | null;
  anlass?: string | null;
  kanal?: string | null;
  hv_meldung_status?: string | null;
}): boolean {
  if (lead.auftraggeber_kunde_id?.trim()) return true;
  if ((lead.anlass ?? "").trim() === "meldung") return true;
  if ((lead.hv_meldung_status ?? "").trim()) return true;
  const kanal = lead.kanal?.trim();
  if (kanal && HV_PORTAL_KANALE.has(kanal)) return true;
  return false;
}
