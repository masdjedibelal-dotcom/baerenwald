import type { OrgFreigabeStatus } from "@/lib/org/types";

/** Anzeige-Labels im HV-Portal / Eingang. */
export const ORG_FREIGABE_HV_LABELS: Record<OrgFreigabeStatus, string> = {
  nicht_noetig: "Nicht erforderlich",
  ausstehend: "Angebot zur Freigabe",
  beschluss_ausstehend: "Wartet auf Beschluss",
  freigegeben: "Freigegeben",
  abgelehnt: "Abgelehnt",
};

export function orgFreigabeHvLabel(status?: string | null): string {
  const key = (status ?? "").trim() as OrgFreigabeStatus;
  return ORG_FREIGABE_HV_LABELS[key] ?? status?.trim() ?? "—";
}

/** Freigabe offen (Entscheidung oder Beschluss-Parkzustand). */
export function isOrgFreigabeOffen(status?: string | null): boolean {
  const s = (status ?? "").trim();
  return s === "ausstehend" || s === "beschluss_ausstehend" || s === "angefordert";
}

/** Partner-Versand blockiert wie bei ausstehend. */
export function orgFreigabeBlockiertPartner(
  status?: string | null,
  hvMeldungStatus?: string | null
): boolean {
  if ((hvMeldungStatus ?? "").trim() === "notmassnahme") return false;
  const s = (status ?? "").trim();
  return s === "ausstehend" || s === "beschluss_ausstehend" || s === "abgelehnt";
}
