import type { PartnerProfilKontext } from "@/lib/partner/get-partner-data";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import { isPartnerAnfrageOffen } from "@/lib/partner/partner-anfrage-status";

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

export function buildPartnerTermine(input: {
  anfragen: PartnerAnfrageItem[];
  angebote: PartnerAnfrageItem[];
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
  profil: PartnerProfilKontext;
}): PartnerTerminItem[] {
  const { anfragen, angebote, auftragAnfragen, auftraege, profil } = input;
  const list: PartnerTerminItem[] = [];

  for (const a of anfragen) {
    if (!isPartnerAnfrageOffen(a)) continue;
    pushTermin(list, {
      id: `anfrage-${a.id}`,
      sortDatum: isoOrNull(a.gesendet_at),
      datumLabel: a.zeitraum?.trim() || (a.gesendet_at ? fmtPartnerDate(a.gesendet_at) : "Offen"),
      titel: `Anfrage: ${a.gewerk_name || a.angebot_titel}`,
      untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "anfragen",
      selectedId: a.id,
      dringend: true,
    });
  }

  for (const a of auftragAnfragen) {
    pushTermin(list, {
      id: `auftrag-anfrage-${a.id}`,
      sortDatum: isoOrNull(a.start_datum),
      datumLabel: a.start_datum
        ? fmtPartnerDate(a.start_datum)
        : "Auftragsanfrage offen",
      titel: `Auftrag annehmen: ${a.titel}`,
      untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "anfragen",
      selectedId: `auftrag:${a.id}`,
      dringend: true,
    });
  }

  for (const a of angebote) {
    const eingereicht = Boolean(a.hw_eingereicht_at);
    if (!eingereicht) {
      pushTermin(list, {
        id: `angebot-einreichen-${a.id}`,
        sortDatum: isoOrNull(a.antwort_at ?? a.gesendet_at),
        datumLabel: a.zeitraum?.trim() || "Angebot einreichen",
        titel: `Angebot einreichen: ${a.gewerk_name || a.angebot_titel}`,
        untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
        section: "angebote",
        selectedId: a.id,
        dringend: true,
      });
    }

    if (a.projektvertrag_bereit && !a.projektvertrag_bestaetigt_am) {
      pushTermin(list, {
        id: `vertrag-${a.id}`,
        sortDatum: null,
        datumLabel: "Projektvertrag",
        titel: `Vertrag bestätigen: ${a.gewerk_name || a.angebot_titel}`,
        section: "angebote",
        selectedId: a.id,
        dringend: true,
      });
    }
  }

  for (const a of auftraege) {
    const s = a.status.toLowerCase();
    if (s === "abgeschlossen" || s === "storniert") continue;

    if (a.start_datum) {
      pushTermin(list, {
        id: `auftrag-start-${a.id}`,
        sortDatum: isoOrNull(a.start_datum),
        datumLabel: fmtPartnerDate(a.start_datum),
        titel: `Baubeginn: ${a.titel}`,
        untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
        section: "auftraege",
        selectedId: a.id,
      });
    }

    if (a.end_datum) {
      pushTermin(list, {
        id: `auftrag-ende-${a.id}`,
        sortDatum: isoOrNull(a.end_datum),
        datumLabel: fmtPartnerDate(a.end_datum),
        titel: `Geplantes Ende: ${a.titel}`,
        untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
        section: "auftraege",
        selectedId: a.id,
      });
    }

    if (a.vertrag?.projektvertrag_bereit && !a.projektvertrag_bestaetigt_am) {
      pushTermin(list, {
        id: `auftrag-vertrag-${a.id}`,
        sortDatum: isoOrNull(a.start_datum),
        datumLabel: a.start_datum ? fmtPartnerDate(a.start_datum) : "Projektvertrag",
        titel: `Vertrag bestätigen: ${a.titel}`,
        section: "auftraege",
        selectedId: a.id,
        dringend: true,
      });
    }
  }

  for (const item of [...profil.allgemein, ...profil.meister]) {
    if (item.status !== "ablauf_warnung" && item.status !== "abgelaufen") continue;
    const bis = item.dokument?.gueltig_bis;
    pushTermin(list, {
      id: `compliance-${item.slug}`,
      sortDatum: isoOrNull(bis),
      datumLabel: bis ? fmtPartnerDate(bis) : item.ablauf_hinweis || "Unterlage",
      titel:
        item.status === "abgelaufen"
          ? `Abgelaufen: ${item.bezeichnung}`
          : `Läuft ab: ${item.bezeichnung}`,
      untertitel: "Profil · Unterlagen",
      section: "profil",
      dringend: item.status === "abgelaufen",
    });
  }

  for (const offen of profil.offeneLeistungsunterlagen) {
    for (const item of offen.items) {
      if (item.status === "erledigt" || item.status === "in_pruefung") continue;
      pushTermin(list, {
        id: `leistung-${offen.auftrag_id}-${item.slug}`,
        sortDatum: null,
        datumLabel: "Unterlage fehlt",
        titel: `${item.bezeichnung} — ${offen.auftrag_titel}`,
        section: "auftraege",
        selectedId: offen.auftrag_id,
        dringend: item.pflicht,
      });
    }
  }

  return list.sort((a, b) => {
    const ad = a.sortDatum ?? OHNE_DATUM;
    const bd = b.sortDatum ?? OHNE_DATUM;
    if (ad !== bd) return ad.localeCompare(bd);
    if (a.dringend && !b.dringend) return -1;
    if (!a.dringend && b.dringend) return 1;
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
