/**
 * Portal 2.0 D11 — HW-Kalkulation (Mock `screenHwKalkulation` / DEFAULT_POSITIONEN).
 */

export type HwKalkPosition = {
  pos: string;
  menge: string;
  einzel: number;
  gewerk: string;
};

/** Mock `DEFAULT_POSITIONEN` 1:1. */
export const DEFAULT_HW_POSITIONEN: HwKalkPosition[] = [
  {
    pos: "Anfahrt & Störungsdiagnose",
    menge: "1 Psch.",
    einzel: 75,
    gewerk: "Sanitär",
  },
  {
    pos: "Austausch Mischbatterie (Material)",
    menge: "1 Stk.",
    einzel: 129,
    gewerk: "Sanitär",
  },
  {
    pos: "Montage & Dichtprüfung",
    menge: "1,5 Std.",
    einzel: 68,
    gewerk: "Sanitär",
  },
  {
    pos: "Kleinmaterial / Dichtungen",
    menge: "1 Psch.",
    einzel: 18,
    gewerk: "Sanitär",
  },
];

export const HW_MWST_SATZ = 0.19;

export type HwKalkSumme = {
  net: number;
  mwst: number;
  brutto: number;
};

/** Mock `hwKalkSumme` — Menge als führende Zahl parsen. */
export function parseHwMengeFaktor(menge: string): number {
  const m = String(menge ?? "")
    .trim()
    .replace(",", ".")
    .match(/^\d+(?:\.\d+)?/);
  if (!m) return 1;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function hwKalkSumme(positionen: HwKalkPosition[]): HwKalkSumme {
  const net = positionen.reduce((s, p) => {
    const m = parseHwMengeFaktor(p.menge);
    const e = Number(p.einzel) || 0;
    return s + e * m;
  }, 0);
  const mwst = net * HW_MWST_SATZ;
  return { net, mwst, brutto: net + mwst };
}

export function hwKalkPatch(
  positionen: HwKalkPosition[],
  index: number,
  key: keyof HwKalkPosition,
  val: string | number
): HwKalkPosition[] {
  return positionen.map((p, j) => {
    if (j !== index) return p;
    if (key === "einzel") {
      return { ...p, einzel: Number(val) || 0 };
    }
    return { ...p, [key]: String(val) };
  });
}

export function hwKalkAdd(
  positionen: HwKalkPosition[],
  gewerkFallback = "Sonstiges"
): HwKalkPosition[] {
  const gewerk = positionen[0]?.gewerk || gewerkFallback;
  return [
    ...positionen,
    { pos: "", menge: "1 Stk.", einzel: 0, gewerk },
  ];
}

export function hwKalkDel(
  positionen: HwKalkPosition[],
  index: number
): HwKalkPosition[] {
  return positionen.filter((_, j) => j !== index);
}

export function hwKalkValid(positionen: HwKalkPosition[]): boolean {
  const usable = positionen.filter((p) => p.pos.trim());
  if (!usable.length) return false;
  return usable.every((p) => Number(p.einzel) >= 0);
}

export function formatHwMoney(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

/** Angebots-Herkunft (Migration D11). */
export const ANGEBOT_HERKUNFT_HANDWERKER = "handwerker" as const;

/** Abschluss-Checkliste Mock `screenAbschlussDoku`. */
export const HW_ABSCHLUSS_CHECKS = [
  {
    id: "leistung",
    title: "Leistungen erbracht",
    subtitle: "Alle beauftragten Arbeiten wurden vollständig ausgeführt.",
  },
  {
    id: "funktion",
    title: "Funktionsprüfung",
    subtitle: "Funktion getestet, keine Restmängel.",
  },
  {
    id: "sauber",
    title: "Arbeitsplatz",
    subtitle: "Arbeitsplatz gereinigt und übergeben.",
  },
  {
    id: "material",
    title: "Material dokumentiert",
    subtitle: "Verbautes Material entspricht dem Angebot.",
  },
] as const;

export type HwAbschlussCheckId = (typeof HW_ABSCHLUSS_CHECKS)[number]["id"];
