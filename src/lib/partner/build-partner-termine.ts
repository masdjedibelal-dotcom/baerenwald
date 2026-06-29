import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";

export type PartnerPlanerSection = "vorgaenge" | "profil";

const OHNE_DATUM = "9999-12-31";

export type PartnerTerminLeistungZeile = {
  id: string;
  label: string;
  von: string | null;
  bis: string | null;
  vonBisLabel: string;
  sortStart: string;
  sortEnd: string;
};

export type PartnerTerminAuftragCard = {
  id: string;
  titel: string;
  ort?: string;
  von: string | null;
  bis: string | null;
  vonBisLabel: string;
  leistungen: PartnerTerminLeistungZeile[];
  /** Mehrere Leistungen oder unterschiedliche Zeiträume → Details aufklappbar */
  detailsAufklappbar: boolean;
  section: PartnerPlanerSection;
  selectedId: string;
  sortDatum: string | null;
};

/** @deprecated Einzeltermine — nur noch für Legacy-Counts; nutze PartnerTerminAuftragCard */
export type PartnerTerminItem = {
  id: string;
  sortDatum: string | null;
  datumLabel: string;
  titel: string;
  untertitel?: string;
  section: PartnerPlanerSection | "anfragen" | "angebote";
  selectedId?: string;
  dringend?: boolean;
};

function isoOrNull(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function formatPartnerVonBis(
  von: string | null,
  bis: string | null
): string {
  if (von && bis) {
    if (von === bis) return fmtPartnerDate(von);
    return `${fmtPartnerDate(von)} – ${fmtPartnerDate(bis)}`;
  }
  if (von) return `ab ${fmtPartnerDate(von)}`;
  if (bis) return `bis ${fmtPartnerDate(bis)}`;
  return "Termin folgt";
}

function minIso(dates: Array<string | null>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d));
  if (!valid.length) return null;
  return valid.sort()[0]!;
}

function maxIso(dates: Array<string | null>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d));
  if (!valid.length) return null;
  return valid.sort().at(-1)!;
}

function buildLeistungZeilen(auftrag: PartnerAuftragItem): PartnerTerminLeistungZeile[] {
  const rows: PartnerTerminLeistungZeile[] = [];

  for (const pos of auftrag.positionen) {
    const von = isoOrNull(pos.start_datum);
    const bis = isoOrNull(pos.end_datum);
    if (!von && !bis) continue;

    const label =
      pos.leistung_name?.trim() || pos.gewerk_name?.trim() || "Leistung";

    rows.push({
      id: pos.id,
      label,
      von,
      bis,
      vonBisLabel: formatPartnerVonBis(von, bis),
      sortStart: von ?? bis ?? OHNE_DATUM,
      sortEnd: bis ?? von ?? OHNE_DATUM,
    });
  }

  return rows.sort((a, b) => {
    if (a.sortStart !== b.sortStart) return a.sortStart.localeCompare(b.sortStart);
    return a.sortEnd.localeCompare(b.sortEnd);
  });
}

function rangesDiffer(rows: PartnerTerminLeistungZeile[]): boolean {
  if (rows.length <= 1) return false;
  const first = `${rows[0]!.von ?? ""}|${rows[0]!.bis ?? ""}`;
  return rows.some((r) => `${r.von ?? ""}|${r.bis ?? ""}` !== first);
}

function buildAuftragTerminCard(
  auftrag: PartnerAuftragItem,
  section: PartnerPlanerSection,
  selectedId: string
): PartnerTerminAuftragCard | null {
  const leistungen = buildLeistungZeilen(auftrag);
  const auftragVon = isoOrNull(auftrag.start_datum);
  const auftragBis = isoOrNull(auftrag.end_datum);

  const von = minIso([auftragVon, ...leistungen.map((l) => l.von)]);
  const bis = maxIso([auftragBis, ...leistungen.map((l) => l.bis)]);

  if (!von && !bis && leistungen.length === 0) return null;

  const ort = [auftrag.plz, auftrag.ort].filter(Boolean).join(" ").trim() || undefined;

  return {
    id: auftrag.id,
    titel: auftrag.listen_titel,
    ort,
    von,
    bis,
    vonBisLabel: formatPartnerVonBis(von, bis),
    leistungen,
    detailsAufklappbar: leistungen.length > 1 && rangesDiffer(leistungen),
    section,
    selectedId,
    sortDatum: von ?? bis,
  };
}

export function buildPartnerTerminAuftragCards(input: {
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
}): PartnerTerminAuftragCard[] {
  const seen = new Set<string>();
  const cards: PartnerTerminAuftragCard[] = [];

  for (const a of input.auftragAnfragen) {
    if (seen.has(a.id)) continue;
    const card = buildAuftragTerminCard(a, "vorgaenge", a.id);
    if (card) {
      seen.add(a.id);
      cards.push(card);
    }
  }

  for (const a of input.auftraege) {
    const s = a.status.toLowerCase();
    if (s === "abgeschlossen" || s === "storniert") continue;
    if (seen.has(a.id)) continue;
    const card = buildAuftragTerminCard(a, "vorgaenge", a.id);
    if (card) {
      seen.add(a.id);
      cards.push(card);
    }
  }

  return cards.sort((a, b) => {
    const ad = a.sortDatum ?? OHNE_DATUM;
    const bd = b.sortDatum ?? OHNE_DATUM;
    if (ad !== bd) return ad.localeCompare(bd);
    return a.titel.localeCompare(b.titel, "de");
  });
}

/** Flache Liste (z. B. Badge-Zähler) */
export function buildPartnerTermine(input: {
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
}): PartnerTerminItem[] {
  return buildPartnerTerminAuftragCards(input).map((card) => ({
    id: card.id,
    sortDatum: card.sortDatum,
    datumLabel: card.vonBisLabel,
    titel: card.titel,
    untertitel: card.ort,
    section: card.section,
    selectedId: card.selectedId,
  }));
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
