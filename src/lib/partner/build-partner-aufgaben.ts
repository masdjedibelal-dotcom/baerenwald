import type { PartnerOffeneLeistungsUnterlage } from "@/lib/partner/compliance-summary";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchAnfrageItem,
} from "@/lib/partner/get-partner-data";
import { resolvePartnerAngebotPortalPhase } from "@/lib/partner/partner-angebot-portal-status";
import {
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerAuftragWartetAufPreiseinigung,
  partnerAuftragAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  partnerOffenStatusLabel,
  type PartnerOffenItem,
} from "@/lib/partner/partner-offen-status";
import type { PartnerPlanerSection } from "@/lib/partner/build-partner-termine";

export type PartnerAufgabeTyp =
  | "bestaetigen"
  | "auftrag_annehmen"
  | "preise_senden"
  | "vertrag_bestaetigen"
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
  /** Gruppierung nach Projekt/Auftrag */
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
      const phase = resolvePartnerAngebotPortalPhase(a);
      const typ = entry.item.offen_karten_typ;

      if (phase === "auftrag_freigegeben") {
        pushAufgabe(list, {
          id: `offen-vertrag-${a.id}`,
          typ: "vertrag_bestaetigen",
          titel: "Auftrag verbindlich annehmen",
          untertitel: "Rahmenvertrag prüfen und bestätigen",
          dringend: true,
          ...gruppe,
        });
      } else if (typ === "nachreichung") {
        pushAufgabe(list, {
          id: `offen-nachreichung-${a.id}`,
          typ: "bestaetigen",
          titel: "Neue Leistung bestätigen",
          untertitel: partnerOffenStatusLabel(typ),
          dringend: true,
          ...gruppe,
        });
      } else if (typ === "geaendert") {
        pushAufgabe(list, {
          id: `offen-geaendert-${a.id}`,
          typ: "bestaetigen",
          titel: "Geänderte Leistung prüfen",
          dringend: true,
          ...gruppe,
        });
      } else {
        pushAufgabe(list, {
          id: `offen-bestaetigen-${a.id}`,
          typ: "bestaetigen",
          titel: "Leistung bestätigen",
          untertitel: partnerOffenStatusLabel(typ),
          dringend: true,
          ...gruppe,
        });
      }

      if (
        phase === "wartet_auf_freigabe" &&
        !a.hw_angebot_pdf_url &&
        !a.hw_angebot_anhang_urls?.length
      ) {
        pushAufgabe(list, {
          id: `offen-pdf-${a.id}`,
          typ: "dokument_hochladen",
          titel: "Unterlagen hochladen (optional)",
          untertitel: "PDF für Bärenwald — z. B. Angebot oder Kalkulation",
          dringend: false,
          ...gruppe,
          sortKey: `9-${a.id}`,
        });
      }
      continue;
    }

    const a = entry.item;
    const gruppe = gruppeFromAuftrag(a);

    if (isPartnerAuftragAnfrageAktionErforderlich(a)) {
      if (isPartnerAuftragWartetAufPreiseinigung(a)) {
        continue;
      }

      const hw = a.hwStatus.toLowerCase();
      if (hw === "akzeptiert") {
        pushAufgabe(list, {
          id: `offen-preise-${a.id}`,
          typ: "preise_senden",
          titel: "Angebotspreis senden",
          untertitel: partnerAuftragAnfrageStatusLabel(a),
          dringend: true,
          ...gruppe,
        });
      } else {
        pushAufgabe(list, {
          id: `offen-auftrag-${a.id}`,
          typ: "auftrag_annehmen",
          titel: "Auftrag annehmen oder ablehnen",
          untertitel: partnerAuftragAnfrageStatusLabel(a),
          dringend: true,
          ...gruppe,
        });
      }
    }
  }

  for (const a of auftraege) {
    const s = a.status.toLowerCase();
    if (s === "abgeschlossen" || s === "storniert") continue;

    const gruppe = {
      gruppeKey: `auftrag:${a.id}`,
      gruppeTitel: a.listen_titel,
      gruppeUntertitel: [a.plz, a.ort].filter(Boolean).join(" ") || undefined,
      section: "auftraege" as const,
      selectedId: a.id,
      sortKey: `auftrag-${a.start_datum ?? a.id}`,
    };

    if (a.vertrag?.projektvertrag_bereit && !a.projektvertrag_bestaetigt_am) {
      pushAufgabe(list, {
        id: `vertrag-auftrag-${a.id}`,
        typ: "vertrag_bestaetigen",
        titel: "Projektvertrag bestätigen",
        dringend: true,
        ...gruppe,
      });
    }

    if (a.bautagebuchAnfrageOffen) {
      const already = bautagebuchAnfragen.some((r) => r.auftrag_id === a.id);
      if (!already) {
        pushAufgabe(list, {
          id: `bautagebuch-flag-${a.id}`,
          typ: "bautagebuch_eintrag",
          titel: "Tagebucheintrag erstellen",
          untertitel: "Bärenwald hat einen Eintrag angefordert",
          dringend: true,
          ...gruppe,
        });
      }
    }
  }

  for (const req of bautagebuchAnfragen) {
    const auftrag = auftraege.find((a) => a.id === req.auftrag_id);
    const titel = auftrag?.listen_titel ?? "Auftrag";
    pushAufgabe(list, {
      id: `bautagebuch-${req.id}`,
      typ: "bautagebuch_eintrag",
      titel: "Tagebucheintrag erstellen",
      untertitel: req.notiz?.trim() || "Bärenwald hat einen Tagebucheintrag angefordert.",
      section: "auftraege",
      selectedId: req.auftrag_id,
      dringend: true,
      gruppeKey: `auftrag:${req.auftrag_id}`,
      gruppeTitel: titel,
      gruppeUntertitel: auftrag
        ? [auftrag.plz, auftrag.ort].filter(Boolean).join(" ") || undefined
        : undefined,
      sortKey: `5-${req.created_at}`,
    });
  }

  for (const block of offeneLeistungsunterlagen) {
    pushAufgabe(list, {
      id: `unterlagen-${block.auftrag_id}`,
      typ: "unterlagen_hochladen",
      titel: `Pflicht-Unterlagen hochladen (${block.offene_pflicht})`,
      untertitel: "Im Auftrag unter Dokumente / Compliance",
      section: "auftraege",
      selectedId: block.auftrag_id,
      dringend: true,
      gruppeKey: `auftrag:${block.auftrag_id}`,
      gruppeTitel: block.auftrag_titel,
      sortKey: `6-${block.auftrag_id}`,
    });
  }

  return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "de"));
}

export function groupPartnerAufgaben(
  aufgaben: PartnerAufgabeItem[]
): PartnerAufgabenGruppe[] {
  const map = new Map<string, PartnerAufgabenGruppe>();

  for (const item of aufgaben) {
    const existing = map.get(item.gruppeKey);
    if (!existing) {
      map.set(item.gruppeKey, {
        key: item.gruppeKey,
        titel: item.gruppeTitel,
        untertitel: item.gruppeUntertitel,
        section: item.section,
        selectedId: item.selectedId,
        sortKey: item.sortKey,
        items: [item],
        dringend: Boolean(item.dringend),
      });
      continue;
    }
    existing.items.push(item);
    if (item.dringend) existing.dringend = true;
    if (item.sortKey.localeCompare(existing.sortKey, "de") < 0) {
      existing.sortKey = item.sortKey;
    }
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => a.sortKey.localeCompare(b.sortKey, "de")),
    }))
    .sort((a, b) => {
      if (a.dringend !== b.dringend) return a.dringend ? -1 : 1;
      return a.sortKey.localeCompare(b.sortKey, "de");
    });
}
