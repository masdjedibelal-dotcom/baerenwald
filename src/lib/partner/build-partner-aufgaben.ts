import type { PartnerTerminItem } from "@/lib/partner/build-partner-termine";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
  PartnerBautagebuchAnfrageItem,
} from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen, isPartnerAuftragAnfrageOffen } from "@/lib/partner/partner-anfrage-status";

export type PartnerAufgabeTyp =
  | "anfrage_annehmen"
  | "auftrag_annehmen"
  | "angebot_einreichen"
  | "vertrag_bestaetigen"
  | "bautagebuch_eintrag";

export type PartnerAufgabeItem = {
  id: string;
  typ: PartnerAufgabeTyp;
  titel: string;
  untertitel?: string;
  section: PartnerTerminItem["section"];
  selectedId?: string;
  dringend?: boolean;
  sortKey: string;
};

function pushAufgabe(list: PartnerAufgabeItem[], item: Omit<PartnerAufgabeItem, "sortKey"> & { sortKey?: string }) {
  list.push({
    ...item,
    sortKey: item.sortKey ?? item.titel,
  });
}

export function buildPartnerAufgaben(input: {
  anfragen: PartnerAnfrageItem[];
  angebote: PartnerAnfrageItem[];
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
  bautagebuchAnfragen: PartnerBautagebuchAnfrageItem[];
  auftragTitelById: Map<string, string>;
}): PartnerAufgabeItem[] {
  const { anfragen, angebote, auftragAnfragen, auftraege, bautagebuchAnfragen, auftragTitelById } =
    input;
  const list: PartnerAufgabeItem[] = [];

  for (const a of anfragen) {
    if (!isPartnerAnfrageOffen(a)) continue;
    pushAufgabe(list, {
      id: `anfrage-${a.id}`,
      typ: "anfrage_annehmen",
      titel: `Anfrage annehmen: ${a.listen_titel}`,
      untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "anfragen",
      selectedId: a.id,
      dringend: true,
      sortKey: `1-${a.gesendet_at ?? a.id}`,
    });
  }

  for (const a of auftragAnfragen) {
    if (!isPartnerAuftragAnfrageOffen(a)) continue;
    pushAufgabe(list, {
      id: `auftrag-anfrage-${a.id}`,
      typ: "auftrag_annehmen",
      titel: `Auftrag annehmen: ${a.listen_titel}`,
      untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "anfragen",
      selectedId: `auftrag:${a.id}`,
      dringend: true,
      sortKey: `2-${a.start_datum ?? a.id}`,
    });
  }

  for (const a of angebote) {
    const hwSt = (a.hw_status ?? "offen").toLowerCase();
    const brauchtEinreichung =
      a.status.toLowerCase() === "akzeptiert" &&
      (hwSt === "offen" || hwSt === "rueckfrage" || hwSt === "abgelehnt");
    if (brauchtEinreichung) {
      pushAufgabe(list, {
        id: `angebot-einreichen-${a.id}`,
        typ: "angebot_einreichen",
        titel: `Preis & Angebot abgeben: ${a.listen_titel}`,
        untertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
        section: "angebote",
        selectedId: a.id,
        dringend: true,
        sortKey: `3-${a.antwort_at ?? a.gesendet_at ?? a.id}`,
      });
    }

    if (a.projektvertrag_bereit && !a.projektvertrag_bestaetigt_am) {
      pushAufgabe(list, {
        id: `vertrag-angebot-${a.id}`,
        typ: "vertrag_bestaetigen",
        titel: `Projektvertrag bestätigen: ${a.listen_titel}`,
        section: "angebote",
        selectedId: a.id,
        dringend: true,
        sortKey: `4-${a.id}`,
      });
    }
  }

  for (const a of auftraege) {
    const s = a.status.toLowerCase();
    if (s === "abgeschlossen" || s === "storniert") continue;

    if (a.vertrag?.projektvertrag_bereit && !a.projektvertrag_bestaetigt_am) {
      pushAufgabe(list, {
        id: `vertrag-auftrag-${a.id}`,
        typ: "vertrag_bestaetigen",
        titel: `Projektvertrag bestätigen: ${a.listen_titel}`,
        section: "auftraege",
        selectedId: a.id,
        dringend: true,
        sortKey: `4-${a.start_datum ?? a.id}`,
      });
    }
  }

  for (const req of bautagebuchAnfragen) {
    const titel = auftragTitelById.get(req.auftrag_id) ?? "Auftrag";
    pushAufgabe(list, {
      id: `bautagebuch-${req.id}`,
      typ: "bautagebuch_eintrag",
      titel: `Tagebucheintrag: ${titel}`,
      untertitel: req.notiz?.trim() || "Bärenwald hat einen Tagebucheintrag angefordert.",
      section: "auftraege",
      selectedId: req.auftrag_id,
      dringend: true,
      sortKey: `5-${req.created_at}`,
    });
  }

  return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "de"));
}
