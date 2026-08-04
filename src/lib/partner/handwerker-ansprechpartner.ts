/** Ansprechpartner — CRM speichert Vor- und Nachname getrennt (`handwerker.vorname` / `nachname`). */
export function resolveHandwerkerAnsprechpartner(fields: {
  vorname?: string | null;
  nachname?: string | null;
  name?: string | null;
}): { vorname: string; nachname: string; vollname: string } {
  let vorname = fields.vorname?.trim() ?? "";
  let nachname = fields.nachname?.trim() ?? "";

  if (!vorname && !nachname) {
    const parts = (fields.name ?? "").trim().split(/\s+/).filter(Boolean);
    vorname = parts[0] ?? "";
    nachname = parts.slice(1).join(" ");
  }

  const vollname = [vorname, nachname].filter(Boolean).join(" ").trim();
  return {
    vorname,
    nachname,
    vollname: vollname || (fields.name?.trim() ?? ""),
  };
}
