import type { PartnerOffeneLeistungsUnterlage } from "@/lib/partner/compliance-summary";
import type {
  PartnerBautagebuchAnfrageItem,
  PartnerVorgangItem,
} from "@/lib/partner/get-partner-data";
import type { PartnerPlanerSection } from "@/lib/partner/build-partner-termine";
import { vorgangStateLabel } from "@/lib/partner/vorgang-state";

export type PartnerAufgabeTyp =
  | "bestaetigen"
  | "auftrag_annehmen"
  | "unterlagen_hochladen"
  | "bautagebuch_eintrag"
  | "rechnung_einreichen"
  | "dokument_hochladen";

export type PartnerAufgabeItem = {
  id: string;
  typ: PartnerAufgabeTyp;
  titel: string;
  untertitel?: string;
  section: PartnerPlanerSection;
  selectedId?: string;
  dringend?: boolean;
  sortKey: string;
  gruppeKey: string;
  gruppeTitel: string;
  gruppeUntertitel?: string;
};

export type PartnerAufgabenGruppe = {
  key: string;
  titel: string;
  untertitel?: string;
  section: PartnerPlanerSection;
  selectedId?: string;
  sortKey: string;
  items: PartnerAufgabeItem[];
  dringend: boolean;
};

function pushAufgabe(
  list: PartnerAufgabeItem[],
  item: Omit<PartnerAufgabeItem, "sortKey"> & { sortKey?: string }
) {
  list.push({
    ...item,
    sortKey: item.sortKey ?? item.titel,
  });
}

function gruppeFromVorgang(v: PartnerVorgangItem) {
  return {
    gruppeKey: `auftrag:${v.id}`,
    gruppeTitel: v.auftrag.listen_titel,
    gruppeUntertitel:
      [v.auftrag.plz, v.auftrag.ort].filter(Boolean).join(" ") || undefined,
    section: "vorgaenge" as const,
    selectedId: v.id,
    sortKey: `vorgang-${v.auftrag.start_datum ?? v.id}`,
  };
}

export function buildPartnerAufgaben(input: {
  vorgaenge: PartnerVorgangItem[];
  bautagebuchAnfragen: PartnerBautagebuchAnfrageItem[];
  offeneLeistungsunterlagen: PartnerOffeneLeistungsUnterlage[];
}): PartnerAufgabeItem[] {
  const { vorgaenge, bautagebuchAnfragen, offeneLeistungsunterlagen } = input;
  const list: PartnerAufgabeItem[] = [];

  for (const v of vorgaenge) {
    const gruppe = gruppeFromVorgang(v);

    if (v.state === "neu") {
      pushAufgabe(list, {
        id: `vorgang-neu-${v.id}`,
        typ: v.anfrage ? "bestaetigen" : "auftrag_annehmen",
        titel: v.anfrage ? "Leistung bestätigen" : "Auftrag annehmen oder ablehnen",
        untertitel: vorgangStateLabel(v.state),
        dringend: true,
        ...gruppe,
      });
    }

    if (v.state === "geaendert") {
      pushAufgabe(list, {
        id: `vorgang-geaendert-${v.id}`,
        typ: "bestaetigen",
        titel: "Änderungen bestätigen",
        untertitel: vorgangStateLabel(v.state),
        dringend: true,
        ...gruppe,
      });
    }

    if (v.auftrag.bautagebuchAnfrageOffen) {
      pushAufgabe(list, {
        id: `bt-anfrage-${v.id}`,
        typ: "bautagebuch_eintrag",
        titel: "Bautagebuch-Eintrag",
        untertitel: "Bärenwald hat um einen Eintrag gebeten",
        dringend: true,
        ...gruppe,
      });
    }
  }

  for (const bt of bautagebuchAnfragen) {
    const vorgang = vorgaenge.find((v) => v.id === bt.auftrag_id);
    if (!vorgang) continue;
    pushAufgabe(list, {
      id: `bt-offen-${bt.id}`,
      typ: "bautagebuch_eintrag",
      titel: "Bautagebuch-Eintrag",
      untertitel: bt.notiz?.trim() || undefined,
      dringend: true,
      gruppeKey: `auftrag:${vorgang.id}`,
      gruppeTitel: vorgang.auftrag.listen_titel,
      gruppeUntertitel:
        [vorgang.auftrag.plz, vorgang.auftrag.ort].filter(Boolean).join(" ") ||
        undefined,
      section: "vorgaenge",
      selectedId: vorgang.id,
      sortKey: `bt-${bt.created_at}`,
    });
  }

  for (const block of offeneLeistungsunterlagen) {
    for (const u of block.items) {
      pushAufgabe(list, {
        id: `unterlage-${block.auftrag_id}-${u.slug}`,
        typ: "unterlagen_hochladen",
        titel: u.bezeichnung,
        untertitel: block.auftrag_titel,
        dringend: false,
        gruppeKey: `auftrag:${block.auftrag_id}`,
        gruppeTitel: block.auftrag_titel,
        section: "vorgaenge",
        selectedId: block.auftrag_id,
        sortKey: `unterlage-${u.slug}`,
      });
    }
  }

  return list;
}

export function groupPartnerAufgaben(
  items: PartnerAufgabeItem[]
): PartnerAufgabenGruppe[] {
  const byKey = new Map<string, PartnerAufgabenGruppe>();

  for (const item of items) {
    const existing = byKey.get(item.gruppeKey);
    if (existing) {
      existing.items.push(item);
      existing.dringend = existing.dringend || Boolean(item.dringend);
      continue;
    }
    byKey.set(item.gruppeKey, {
      key: item.gruppeKey,
      titel: item.gruppeTitel,
      untertitel: item.gruppeUntertitel,
      section: item.section,
      selectedId: item.selectedId,
      sortKey: item.sortKey,
      items: [item],
      dringend: Boolean(item.dringend),
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey)
  );
}
