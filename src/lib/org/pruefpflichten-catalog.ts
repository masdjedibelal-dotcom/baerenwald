/** Prüfpflichten-Typen je Objekt — Dropdown + internes Gewerk-Mapping. */

export const PRUEFPFLICHT_TYPEN = [
  {
    schluessel: "legionellen",
    label: "Legionellenprüfung",
    intervallMonate: 36,
    gewerkName: "Sanitär",
  },
  {
    schluessel: "trinkwasser",
    label: "Trinkwasserhygiene",
    intervallMonate: 36,
    gewerkName: "Sanitär",
  },
  {
    schluessel: "rauchmelder",
    label: "Rauchmelder",
    intervallMonate: 12,
    gewerkName: "Elektro",
  },
  {
    schluessel: "heizung",
    label: "Heizungswartung",
    intervallMonate: 12,
    gewerkName: "Heizung",
  },
  {
    schluessel: "aufzug",
    label: "Aufzug / Förderanlage",
    intervallMonate: 12,
    gewerkName: "Aufzug",
  },
  {
    schluessel: "feuerloescher",
    label: "Feuerlöscher / Brandschutz",
    intervallMonate: 24,
    gewerkName: null,
  },
  {
    schluessel: "blitzschutz",
    label: "Blitzschutz",
    intervallMonate: 48,
    gewerkName: "Elektro",
  },
  {
    schluessel: "dachrinnen",
    label: "Dachrinnen / Fallrohre",
    intervallMonate: 12,
    gewerkName: null,
  },
  {
    schluessel: "gas",
    label: "Gasprüfung",
    intervallMonate: 12,
    gewerkName: "Heizung",
  },
  {
    schluessel: "sonstiges",
    label: "Sonstiges …",
    intervallMonate: null,
    gewerkName: null,
  },
] as const;

export type PruefpflichtTypSchluessel =
  (typeof PRUEFPFLICHT_TYPEN)[number]["schluessel"];

export function pruefpflichtTypBySchluessel(schluessel: string) {
  return PRUEFPFLICHT_TYPEN.find((t) => t.schluessel === schluessel) ?? null;
}

export type PruefpflichtBadgeStatus =
  | "ueberfaellig"
  | "bald_faellig"
  | "ok"
  | "kein_datum";

export function resolvePruefpflichtBadge(
  naechsteFaellig: string | null | undefined,
  today = new Date()
): PruefpflichtBadgeStatus {
  const raw = naechsteFaellig?.trim()?.slice(0, 10);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "kein_datum";
  const day = raw;
  const heute = today.toISOString().slice(0, 10);
  if (day < heute) return "ueberfaellig";
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  if (day <= in30.toISOString().slice(0, 10)) return "bald_faellig";
  return "ok";
}

export const PRUEFPFLICHT_BADGE_LABEL: Record<PruefpflichtBadgeStatus, string> =
  {
    ueberfaellig: "Überfällig",
    bald_faellig: "Bald fällig",
    ok: "OK",
    kein_datum: "Kein Datum",
  };

export function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(isoDate.slice(0, 10));
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
