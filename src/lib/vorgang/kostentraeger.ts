export const KOSTENTRAEGER = [
  "gemeinschaft",
  "sondereigentum",
  "mieter",
  "versicherung",
  "unklar",
] as const;

export type Kostentraeger = (typeof KOSTENTRAEGER)[number];

export const KOSTENTRAEGER_LABELS: Record<Kostentraeger, string> = {
  gemeinschaft: "Gemeinschaft (WEG)",
  sondereigentum: "Sondereigentum",
  mieter: "Mieter",
  versicherung: "Versicherung",
  unklar: "Noch unklar",
};

export function isKostentraeger(value: string | null | undefined): value is Kostentraeger {
  return !!value && (KOSTENTRAEGER as readonly string[]).includes(value);
}

/** Kleinreparatur → Vorschlag Mieter als Kostenträger. */
export function vorgeschlagenerKostentraeger(lead: {
  hv_meldung_status?: string | null;
  anlass?: string | null;
  funnel_daten?: unknown;
}): Kostentraeger | null {
  if ((lead.hv_meldung_status ?? "").trim() === "kleinreparatur") {
    return "mieter";
  }
  const fd = lead.funnel_daten;
  if (fd && typeof fd === "object") {
    const kat = (fd as { melde_kategorie?: string }).melde_kategorie;
    if (kat === "kleinreparatur") return "mieter";
  }
  return null;
}

export function kostentraegerLabel(value: string | null | undefined): string {
  if (!value || !isKostentraeger(value)) return "—";
  return KOSTENTRAEGER_LABELS[value];
}
