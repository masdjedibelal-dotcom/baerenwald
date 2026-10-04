import type { PartnerOffeneLeistungsUnterlage } from "@/lib/partner/compliance-summary";
import type { PartnerVorgangItem } from "@/lib/partner/get-partner-data";
import type { PartnerPlanerSection } from "@/lib/partner/build-partner-termine";
import { vorgangStateLabel } from "@/lib/partner/vorgang-state";

export type PartnerAufgabeTyp =
  | "bestaetigen"
  | "auftrag_annehmen"
  | "unterlagen_hochladen"
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
  offeneLeistungsunterlagen: PartnerOffeneLeistungsUnterlage[];
}): PartnerAufgabeItem[] {
  const { vorgaenge, offeneLeistungsunterlagen } = input;
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
