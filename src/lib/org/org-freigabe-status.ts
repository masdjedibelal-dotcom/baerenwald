
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
