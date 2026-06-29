import {
  partnerVorgangIdFromNotificationLink,
  resolvePartnerNotificationLink,
} from "@/lib/partner/partner-site-url";

export type PartnerNotificationTyp =
  | "neu"
  | "geaendert"
  | "entfernt"
  | "erinnerung"
  | "bautagebuch";

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

/** Ein Schlüssel pro Vorgang — gleiche Anfrage/Auftrag nicht mehrfach zählen. */
export function partnerNotificationVorgangKey(
  link: string | null | undefined
): string | null {
  const id = partnerVorgangIdFromNotificationLink(link);
  if (id) return id;
  const path = resolvePartnerNotificationLink(link);
  return path?.trim() || null;
}

/** Pro Vorgang nur die neueste Zeile; ungelesen wenn irgendeine Duplikat-Zeile offen ist. */
export function dedupePartnerNotificationsByVorgang(
  items: PartnerNotificationRow[]
): PartnerNotificationRow[] {
  const groups = new Map<string, PartnerNotificationRow[]>();

  for (const item of items) {
    const key = partnerNotificationVorgangKey(item.link) ?? `notification:${item.id}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const deduped: PartnerNotificationRow[] = [];
  for (const group of Array.from(groups.values())) {
    const sorted = [...group].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0]!;
    deduped.push({
      ...latest,
      gelesen: group.every((n: PartnerNotificationRow) => n.gelesen),
    });
  }

  return deduped.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function countUnreadPartnerNotificationsByVorgang(
  items: PartnerNotificationRow[]
): number {
  return dedupePartnerNotificationsByVorgang(items).filter((n) => !n.gelesen).length;
}

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
    case "bautagebuch":
      return `${p} — Bitte Tagebucheintrag erstellen`;
    default:
      return p;
  }
}
