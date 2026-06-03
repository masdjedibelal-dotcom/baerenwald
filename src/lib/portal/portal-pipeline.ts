/**
 * Kundenportal (MeinBärenwald): Zuordnung Anfragen → Angebote → Aufträge nach Status.
 */

export function normalizePortalStatus(status?: string | null): string {
  return (status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

/** Auftrags-Phase inkl. abgeschlossen (gehört unter „Aufträge“). */
export function isPortalAuftragPhaseStatus(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (!s) return false;
  if (s === "auftrag" || s.includes("auftrag")) return true;
  if (s.includes("abgeschlossen") || s.includes("fertig")) return true;
  if (s === "in_arbeit" || s === "aktiv" || s === "planung") return true;
  if (s.includes("completed") || s.includes("done")) return true;
  return false;
}

/** Angebots-Phase (gehört unter „Angebote“, nicht unter „Anfragen“). */
export function isPortalAngebotPhaseStatus(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (!s) return false;
  if (isPortalAuftragPhaseStatus(status)) return false;
  if (s === "angebot" || s.includes("angebot")) return true;
  if (
    s === "gesendet" ||
    s === "entwurf" ||
    s === "angenommen" ||
    s === "kunde_akzeptiert" ||
    s === "abgelaufen"
  ) {
    return true;
  }
  return false;
}

/** Reine Anfrage-Phase (noch kein Angebot / Auftrag im Portal). */
export function isPortalAnfragePhaseStatus(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (!s || s === "neu" || s === "offen") return true;
  if (isPortalAuftragPhaseStatus(status)) return false;
  if (isPortalAngebotPhaseStatus(status)) return false;
  if (s.includes("storniert") || s.includes("abgelehnt")) return false;
  return true;
}
