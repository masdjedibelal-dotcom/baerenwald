import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";

export type PartnerTerminItem = {
  id: string;
  /** ISO-Datum für Sortierung; leer = ans Ende */
  sortDatum: string | null;
  datumLabel: string;
  titel: string;
  untertitel?: string;
  section: "anfragen" | "angebote" | "auftraege" | "profil";
  selectedId?: string;
  dringend?: boolean;
};

const OHNE_DATUM = "9999-12-31";

function isoOrNull(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function pushTermin(
  list: PartnerTerminItem[],
  item: Omit<PartnerTerminItem, "sortDatum"> & { sortDatum?: string | null }
) {
  list.push({
    ...item,
    sortDatum: item.sortDatum ?? null,
  });
}

/** Termine aus zugewiesenen Leistungen (Gewerk/Position im CRM). */
function pushPositionTermine(
  list: PartnerTerminItem[],
  auftrag: PartnerAuftragItem,
  section: "anfragen" | "auftraege",
  selectedId: string
) {
  for (const pos of auftrag.positionen) {
    const label = pos.leistung_name?.trim() || pos.gewerk_name?.trim() || "Leistung";

    if (pos.start_datum) {
      pushTermin(list, {
        id: `pos-start-${pos.id}`,
        sortDatum: isoOrNull(pos.start_datum),
        datumLabel: fmtPartnerDate(pos.start_datum),
        titel: `${label} — Start`,
        untertitel: auftrag.listen_titel,
        section,
        selectedId,
      });
    }

    if (pos.end_datum) {
      pushTermin(list, {
        id: `pos-end-${pos.id}`,
        sortDatum: isoOrNull(pos.end_datum),
        datumLabel: fmtPartnerDate(pos.end_datum),
        titel: `${label} — Ende`,
        untertitel: auftrag.listen_titel,
        section,
        selectedId,
      });
    }
  }
}

export function buildPartnerTermine(input: {
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
  /** @deprecated Termine kommen nur noch aus Positionsdaten */
  anfragen?: PartnerAnfrageItem[];
  angebote?: PartnerAnfrageItem[];
  profil?: unknown;
}): PartnerTerminItem[] {
  const { auftragAnfragen, auftraege } = input;
  const list: PartnerTerminItem[] = [];

  for (const a of auftragAnfragen) {
    if (!a.positionen.length) continue;
    pushPositionTermine(list, a, "anfragen", `auftrag:${a.id}`);
  }

  for (const a of auftraege) {
    const s = a.status.toLowerCase();
    if (s === "abgeschlossen" || s === "storniert") continue;
    if (!a.positionen.length) continue;
    pushPositionTermine(list, a, "auftraege", a.id);
  }

  return list.sort((a, b) => {
    const ad = a.sortDatum ?? OHNE_DATUM;
    const bd = b.sortDatum ?? OHNE_DATUM;
    if (ad !== bd) return ad.localeCompare(bd);
    return a.titel.localeCompare(b.titel, "de");
  });
}

export function groupPartnerTermine(
  termine: PartnerTerminItem[]
): Array<{ label: string; items: PartnerTerminItem[] }> {
  const groups = new Map<string, PartnerTerminItem[]>();
  for (const t of termine) {
    const key =
      t.sortDatum != null
        ? fmtPartnerDate(t.sortDatum)
        : t.datumLabel || "Demnächst";
    const bucket = groups.get(key) ?? [];
    bucket.push(t);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
