/**
 * Portal 2.0 D8 — Eigentümer (`role=eigentuemer`).
 */

export const EIGENTUEMER_DEFAULT_SCHWELLE_EUR = 500;

export const EIGENTUEMER_PAGE_HEAD = "Eigentümer-Zugang" as const;
export const EIGENTUEMER_LISTE_TITLE = "Meine Wohnung" as const;
export const EIGENTUEMER_DASHBOARD_ROLE = "Eigentümer" as const;

export const EIGENTUEMER_DETAIL_STATUS_TITLE = "Status" as const;
export const EIGENTUEMER_DETAIL_STATUS_NOTE =
  "Ihre Anfrage wird von der Hausverwaltung bearbeitet. Als Eigentümer haben Sie Einblick, die Steuerung liegt bei der Verwaltung." as const;

export const EIGENTUEMER_KOSTENFREIGABE_TITLE = "Kostenfreigabe nötig" as const;
export const EIGENTUEMER_KOSTENFREIGABE_BTN = "✓ Kosten freigeben" as const;
export const EIGENTUEMER_KOSTENFREIGABE_ABLEHNEN = "Ablehnen" as const;

export type EigentuemerFreigabeStatus =
  | "ausstehend"
  | "freigegeben"
  | "abgelehnt"
  | "nicht_noetig";

export function formatEigentuemerSchwelle(
  eur: number | null | undefined
): string {
  const n =
    eur == null || !Number.isFinite(Number(eur))
      ? EIGENTUEMER_DEFAULT_SCHWELLE_EUR
      : Number(eur);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Mock notif body: `{vg} überschreitet Ihren Schwellenwert ({betrag}).`
 * Titel separat: „Kostenfreigabe nötig“.
 */
export function formatEigentuemerKostenfreigabeBody(
  vg: string,
  schwelleEur: number | null | undefined
): string {
  const id = vg.trim() || "Vorgang";
  return `${id} überschreitet Ihren Schwellenwert (${formatEigentuemerSchwelle(schwelleEur)}).`;
}

export function formatEigentuemerKostenfreigabeNotif(input: {
  vg: string;
  schwelleEur?: number | null;
}): { title: string; body: string } {
  return {
    title: EIGENTUEMER_KOSTENFREIGABE_TITLE,
    body: formatEigentuemerKostenfreigabeBody(
      input.vg,
      input.schwelleEur ?? EIGENTUEMER_DEFAULT_SCHWELLE_EUR
    ),
  };
}

/** Betrag über Schwelle → Freigabe nötig (wenn Status ausstehend/null). */
export function eigentuemerNeedsKostenfreigabe(input: {
  betragEur: number | null | undefined;
  schwelleEur: number | null | undefined;
  freigabeStatus?: string | null;
}): boolean {
  const status = (input.freigabeStatus ?? "").trim().toLowerCase();
  if (
    status === "freigegeben" ||
    status === "abgelehnt" ||
    status === "nicht_noetig"
  ) {
    return false;
  }
  const betrag = Number(input.betragEur);
  if (!Number.isFinite(betrag) || betrag <= 0) return false;
  const schwelle =
    input.schwelleEur == null || !Number.isFinite(Number(input.schwelleEur))
      ? EIGENTUEMER_DEFAULT_SCHWELLE_EUR
      : Number(input.schwelleEur);
  return betrag > schwelle;
}

/** Mock `listFor()` Eigentümer: nur Vorgänge mit Objekt in der Zuordnung. */
export function filterLeadsByEigentuemerObjekte<
  T extends { kunde_objekt_id?: string | null },
>(leads: T[], objektIds: string[]): T[] {
  const set = new Set(objektIds.map((id) => id.trim()).filter(Boolean));
  if (set.size === 0) return [];
  return leads.filter((l) => {
    const oid = l.kunde_objekt_id?.trim();
    return oid ? set.has(oid) : false;
  });
}
