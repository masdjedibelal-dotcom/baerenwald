/**
 * Kundenportal (MeinBärenwald): Zuordnung Anfragen → Angebote → Aufträge.
 *
 * Primär datengetrieben (splitKundePortalPipeline): existiert ein Auftrag / Angebot zum Lead?
 * Status-Helfer nur noch für Lead-Fallback ohne verknüpfte Datensätze.
 */

export function normalizePortalStatus(status?: string | null): string {
  return (status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

/** Status eines Auftrags (Tabelle auftraege) — gehört immer unter „Aufträge“. */
export function isAuftragRecordPortalPhase(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (s.includes("storniert")) return false;
  return true;
}

/** Abgeschlossener Auftrag (Status oder Fortschritt 100 %). */
export function isPortalAuftragAbgeschlossenRecord(input: {
  status?: string | null;
  fortschritt?: number | null;
}): boolean {
  const s = normalizePortalStatus(input.status);
  if (s.includes("storniert")) return false;
  if (
    s.includes("abgeschlossen") ||
    s.includes("fertig") ||
    s.includes("completed") ||
    s.includes("done")
  ) {
    return true;
  }
  if (typeof input.fortschritt === "number" && input.fortschritt >= 100) {
    return true;
  }
  return false;
}

export function isPortalAuftragAktivRecord(input: {
  status?: string | null;
  fortschritt?: number | null;
}): boolean {
  const s = normalizePortalStatus(input.status);
  if (s.includes("storniert")) return false;
  return !isPortalAuftragAbgeschlossenRecord(input);
}

/** Auftrags-Phase für Lead-Status (nicht für auftraege.status „offen“). */
export function isPortalAuftragPhaseStatus(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (!s) return false;
  if (s === "auftrag" || s.includes("auftrag")) return true;
  if (s.includes("abgeschlossen") || s.includes("fertig")) return true;
  if (s === "in_arbeit" || s === "aktiv" || s === "planung" || s === "abnahme") return true;
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

/** Reine Anfrage-Phase (Lead-Status, wenn kein verknüpftes Angebot/Auftrag). */
export function isPortalAnfragePhaseStatus(status?: string | null): boolean {
  const s = normalizePortalStatus(status);
  if (!s || s === "neu" || s === "offen") return true;
  if (isPortalAuftragPhaseStatus(status)) return false;
  if (isPortalAngebotPhaseStatus(status)) return false;
  if (s.includes("storniert") || s.includes("abgelehnt")) return false;
  return true;
}

type PortalSplitLead = { id: string; status?: string | null };
type PortalSplitAngebot = { id: string; lead_id?: string | null };
type PortalSplitAuftrag = {
  id: string;
  lead_id?: string | null;
  angebot_id?: string | null;
  status?: string | null;
  fortschritt?: number | null;
};

/**
 * Teilt Kundendaten für die drei Menüpunkte (Single Source of Truth).
 * - Aufträge: alle Auftrags-Datensätze (offen, in_arbeit, abgeschlossen, …)
 * - Angebote: Angebote ohne zugehörigen Auftrag
 * - Anfragen: Leads ohne Angebot und ohne Auftrag
 */
export function splitKundePortalPipeline<TLead extends PortalSplitLead, TAngebot extends PortalSplitAngebot, TAuftrag extends PortalSplitAuftrag>(input: {
  leads: TLead[];
  angebote: TAngebot[];
  auftraege: TAuftrag[];
}): {
  anfragenLeads: TLead[];
  angebote: TAngebot[];
  auftraege: TAuftrag[];
} {
  const auftragLeadIds = new Set(
    input.auftraege
      .map((a) => a.lead_id)
      .filter((id): id is string => Boolean(id))
  );
  const auftragAngebotIds = new Set(
    input.auftraege
      .map((a) => a.angebot_id)
      .filter((id): id is string => Boolean(id))
  );

  const auftraege = input.auftraege.filter((a) =>
    isAuftragRecordPortalPhase(a.status)
  );

  const angebote = input.angebote.filter((a) => !auftragAngebotIds.has(a.id));

  const anfragenLeads = input.leads.filter((l) => {
    if (auftragLeadIds.has(l.id)) return false;
    if (input.angebote.some((a) => a.lead_id === l.id)) return false;
    return isPortalAnfragePhaseStatus(l.status);
  });

  return { anfragenLeads, angebote, auftraege };
}
