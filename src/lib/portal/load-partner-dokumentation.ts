/**
 * Handwerker-Dokumentation → Portal-Bautagebuch-Form.
 *
 * Seit Prozess-Umbau: HW-Updates sind CRM-intern. Kunden-/HV-Portal lädt
 * sie nicht mehr (nur CRM-Tagebuch / Abnahme nach Freigabe).
 */

export type PortalPartnerDokuEntry = {
  id: string;
  datum?: string;
  created_at?: string;
  titel: string;
  notiz?: string;
  fotos_urls: string[];
};

/**
 * Leer — Partner-Updates nicht kunden-sichtbar.
 */
export async function loadPartnerDokumentationByAuftragIds(
  _auftragIds: string[]
): Promise<Map<string, PortalPartnerDokuEntry[]>> {
  return new Map();
}

/** Legacy + Partner-Doku mergen (Partner zuerst / neuer), IDs deduplizieren. */
export function mergePortalBautagebuchEntries(
  legacy: PortalPartnerDokuEntry[],
  partner: PortalPartnerDokuEntry[]
): PortalPartnerDokuEntry[] {
  const byId = new Map<string, PortalPartnerDokuEntry>();
  for (const e of legacy) byId.set(e.id, e);
  for (const e of partner) byId.set(e.id, e);
  return Array.from(byId.values()).sort((a, b) => {
    const da = a.created_at || a.datum || "";
    const db = b.created_at || b.datum || "";
    return db.localeCompare(da);
  });
}
