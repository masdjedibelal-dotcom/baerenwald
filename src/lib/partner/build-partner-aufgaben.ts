import type { PartnerOffeneLeistungsUnterlage } from "@/lib/partner/compliance-summary";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchAnfrageItem,
} from "@/lib/partner/get-partner-data";
import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import {
  partnerOffenStatusLabel,
  type PartnerOffenItem,
} from "@/lib/partner/partner-offen-status";
import type { PartnerPlanerSection } from "@/lib/partner/build-partner-termine";

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

function gruppeFromAuftrag(a: PartnerAuftragItem) {
  return {
    gruppeKey: `auftrag:${a.id}`,
    gruppeTitel: a.listen_titel,
    gruppeUntertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
    section: "offen" as const,
    selectedId: `auftrag:${a.id}`,
    sortKey: `auftrag-${a.start_datum ?? a.id}`,
  };
}

function gruppeFromOffenAngebot(item: PartnerOffenItem & { kind: "angebot" }) {
  const a = item.item;
  const auftragId = a.auftrag_id?.trim();
  if (auftragId) {
    return {
      gruppeKey: `auftrag:${auftragId}`,
      gruppeTitel: a.listen_titel,
      gruppeUntertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "offen" as const,
      selectedId: a.id,
      sortKey: `angebot-${a.gesendet_at ?? a.id}`,
    };
  }
  return {
    gruppeKey: `angebot:${a.id}`,
    gruppeTitel: a.listen_titel,
    gruppeUntertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
    section: "offen" as const,
    selectedId: a.id,
    sortKey: `angebot-${a.gesendet_at ?? a.id}`,
  };
}

export function buildPartnerAufgaben(input: {
  offen: PartnerOffenItem[];
  auftraege: PartnerAuftragItem[];
  bautagebuchAnfragen: PartnerBautagebuchAnfrageItem[];
  offeneLeistungsunterlagen: PartnerOffeneLeistungsUnterlage[];
}): PartnerAufgabeItem[] {
  const { offen, auftraege, bautagebuchAnfragen, offeneLeistungsunterlagen } =
    input;
  const list: PartnerAufgabeItem[] = [];

  for (const entry of offen) {
    if (entry.kind === "angebot") {
      const a = entry.item;
      const gruppe = gruppeFromOffenAngebot(entry);
      const typ = entry.item.offen_karten_typ;

      pushAufgabe(list, {
        id: `offen-bestaetigen-${a.id}`,
        typ: "bestaetigen",
        titel:
          typ === "nachreichung"
            ? "Ergänzung bestätigen"
            : "Leistung bestätigen",
        untertitel: partnerOffenStatusLabel(typ),
        dringend: true,
        ...gruppe,
      });
      continue;
    }

    const a = entry.item;
    const gruppe = gruppeFromAuftrag(a);

    if (isPartnerAuftragAnfrageAktionErforderlich(a)) {
      pushAufgabe(list, {
        id: `offen-auftrag-${a.id}`,
        typ: "auftrag_annehmen",
        titel: "Auftrag annehmen oder ablehnen",
        dringend: true,
        ...gruppe,
      });
    }
  }

  for (const a of auftraege) {
    const gruppe = {
      gruppeKey: `auftrag:${a.id}`,
      gruppeTitel: a.listen_titel,
      gruppeUntertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "auftraege" as const,
      selectedId: a.id,
      sortKey: `auftrag-${a.start_datum ?? a.id}`,
    };

    if (a.bautagebuchAnfrageOffen) {
      pushAufgabe(list, {
        id: `bt-anfrage-${a.id}`,
        typ: "bautagebuch_eintrag",
        titel: "Bautagebuch-Eintrag",
        untertitel: "Bärenwald hat um einen Eintrag gebeten",
        dringend: true,
        ...gruppe,
      });
    }
  }

  for (const bt of bautagebuchAnfragen) {
    const auftrag = auftraege.find((a) => a.id === bt.auftrag_id);
    if (!auftrag) continue;
    pushAufgabe(list, {
      id: `bt-offen-${bt.id}`,
      typ: "bautagebuch_eintrag",
      titel: "Bautagebuch-Eintrag",
      untertitel: bt.notiz?.trim() || undefined,
      dringend: true,
      gruppeKey: `auftrag:${auftrag.id}`,
      gruppeTitel: auftrag.listen_titel,
      gruppeUntertitel: [auftrag.plz, auftrag.ort].filter(Boolean).join(" ") || undefined,
      section: "auftraege",
      selectedId: auftrag.id,
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
        section: "auftraege",
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
