/**
 * Darstellung: Positionen nach partner_aufgabe_id gruppieren.
 * Keine Ableitung von Status, Zeit oder Betragslogik jenseits der übergebenen Positionen.
 */

import { partnerSummeBetraege } from "@/lib/partner/partner-betrag";
import { partnerAufgabeGruppenkopfTitel } from "@/lib/partner/partner-aufgabe-display";

export type PartnerAufgabeListenPosition = {
  id: string;
  leistung_name: string;
  partner_aufgabe_id?: string | null;
  partner_aufgabe_titel?: string | null;
  partner_aufgabe_beschreibung?: string | null;
  typ?: string | null;
  verguetung?: string | null;
  menge?: number | null;
  stundensatz?: number | null;
  preis_partner?: number | null;
  zeit_minuten_summe?: number | null;
};

export type PartnerAufgabeBlock<T extends PartnerAufgabeListenPosition> =
  | { kind: "solo"; position: T }
  | {
      kind: "gruppe";
      aufgabeId: string;
      /** Rohwert aus CRM (leer = LV-Fallback im Kopf). */
      partnerTitel: string | null;
      beschreibung: string | null;
      anzeigeTitel: string;
      positionen: T[];
      zwischensumme: number;
    };

/** Reihenfolge der Eingabeliste bleibt erhalten; Gruppen am ersten Auftreten. */
export function buildPartnerAufgabeBloecke<
  T extends PartnerAufgabeListenPosition,
>(positionen: T[]): PartnerAufgabeBlock<T>[] {
  const bloecke: PartnerAufgabeBlock<T>[] = [];
  const gruppeIndex = new Map<string, number>();

  for (const p of positionen) {
    const aid = p.partner_aufgabe_id?.trim() || "";
    if (!aid) {
      bloecke.push({ kind: "solo", position: p });
      continue;
    }

    const existing = gruppeIndex.get(aid);
    if (existing != null) {
      const block = bloecke[existing];
      if (block?.kind === "gruppe") {
        block.positionen.push(p);
      }
      continue;
    }

    const partnerTitel = p.partner_aufgabe_titel?.trim() || null;
    const beschreibung = p.partner_aufgabe_beschreibung?.trim() || null;
    gruppeIndex.set(aid, bloecke.length);
    bloecke.push({
      kind: "gruppe",
      aufgabeId: aid,
      partnerTitel,
      beschreibung,
      anzeigeTitel: "", // nach Abschluss der Gruppe gesetzt
      positionen: [p],
      zwischensumme: 0,
    });
  }

  for (const block of bloecke) {
    if (block.kind !== "gruppe") continue;
    block.anzeigeTitel = partnerAufgabeGruppenkopfTitel(
      block.partnerTitel,
      block.positionen
    );
    block.zwischensumme = partnerSummeBetraege(block.positionen);
  }

  return bloecke;
}
