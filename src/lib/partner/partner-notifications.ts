export type PartnerNotificationTyp = "neu" | "geaendert" | "entfernt" | "erinnerung";

export type PartnerNotificationRow = {
  id: string;
  handwerker_id: string;
  typ: PartnerNotificationTyp;
  projekt_name: string;
  leistung_name: string | null;
  gelesen: boolean;
  link: string | null;
  created_at: string;
};

export function partnerNotificationSubject(
  typ: PartnerNotificationTyp,
  projektName: string,
  leistungName?: string | null
): string {
  const p = projektName.trim() || "Projekt";
  const l = leistungName?.trim();
  switch (typ) {
    case "neu":
      return `${p} — Neuer Auftrag wartet auf deine Bestätigung`;
    case "geaendert":
      return `${l || "Leistung"} wurde angepasst — bitte bestätigen`;
    case "entfernt":
      return `${l || "Leistung"} wurde aus ${p} entfernt`;
    case "erinnerung":
      return `Erinnerung: Offene Bestätigung für ${p}`;
    default:
      return p;
  }
}
