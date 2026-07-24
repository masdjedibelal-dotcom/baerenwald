/**
 * Turn-Paket „Mieterwechsel“ — Welle-3-Preise (netto München).
 * Keine neuen Preise: baut auf `katalog_produkte` / Seed auf.
 */

export type MieterwechselGroesseId =
  | "bis_45"
  | "46_75"
  | "76_100"
  | "ueber_100";

export type MieterwechselStufeId = 1 | 2 | 3;

export type MieterwechselZubuchId =
  | "endreinigung"
  | "entruempelung"
  | "kueche-demontage"
  | "kueche-montage";

export type MieterwechselModulId = "boden" | "bad" | "elektro";

export const MIETERWECHSEL_GROESSEN: Array<{
  id: MieterwechselGroesseId;
  label: string;
  /** Repräsentative m² für Indikation Stufe 2 ohne manuelle Eingabe. */
  m2Hint: number;
}> = [
  { id: "bis_45", label: "bis 45 m²", m2Hint: 40 },
  { id: "46_75", label: "46–75 m²", m2Hint: 60 },
  { id: "76_100", label: "76–100 m²", m2Hint: 90 },
  { id: "ueber_100", label: "über 100 m²", m2Hint: 120 },
];

export const MIETERWECHSEL_GROESSE_DEFAULT: MieterwechselGroesseId = "46_75";

/** Stufe 1 Fixpreise (katalog `uebergabe-stufe-1`). */
export const STUFE1_FIX: Record<MieterwechselGroesseId, number> = {
  bis_45: 690,
  "46_75": 890,
  "76_100": 1090,
  ueber_100: 1290,
};

/** Stufe 2: Stufe 1 + 32 €/m² (katalog `uebergabe-stufe-2.m2_satz`). */
export const STUFE2_M2_SATZ = 32;

/** Anzeige-Band Maler, wenn keine m² (katalog 25–40 €/m²). */
export const STUFE2_BAND = { min: 25, max: 40 } as const;

export const ENDREINIGUNG_FIX: Record<MieterwechselGroesseId, number> = {
  bis_45: 240,
  "46_75": 320,
  "76_100": 420,
  ueber_100: 520,
};

export const ENTRUEMPELUNG_FIX = 390;
export const KUECHE_DEMONTAGE_FIX = 290;
export const KUECHE_MONTAGE_BAND = { min: 690, max: 1490 } as const;

/** Stufe-3-Module — Indikation aus Renovierungs-Bändern. */
export const MODUL_BODEN_M2 = { min: 45, max: 75 } as const;
export const MODUL_BAD_BAND = { min: 800, max: 2500 } as const;
export const MODUL_ELEKTRO_BAND = { min: 600, max: 1800 } as const;

export type MieterwechselStufeCard = {
  id: MieterwechselStufeId;
  name: string;
  /** Katalog-Slug der Hauptstufe (Stufe 3 = konfiguriert). */
  produktSlug: string;
  tint: string;
  accent: string;
  ic: string;
  desc: string;
  feats: string[];
  pop: boolean;
  /** true = Angebotsweg, Preis nur Indikation. */
  angebot: boolean;
};

export const MIETERWECHSEL_STUFEN: MieterwechselStufeCard[] = [
  {
    id: 1,
    name: "Übergabefertig",
    produktSlug: "uebergabe-stufe-1",
    tint: "#E8EEF6",
    accent: "#2E7D52",
    ic: "🔑",
    desc: "Endabnahme, Kleinreparaturen, Silikon, Feinreinigung und digitales Übergabeprotokoll — Fixpreis nach Wohnungsgröße.",
    feats: [
      "Endabnahme-Check",
      "Kleinreparaturen (30-Min-Deckel)",
      "Silikonfugen",
      "Feinreinigung",
      "Digitales Übergabeprotokoll",
    ],
    pop: false,
    angebot: false,
  },
  {
    id: 2,
    name: "Neuvermietungsfertig",
    produktSlug: "uebergabe-stufe-2",
    tint: "#DDEEDF",
    accent: "#1F6A3F",
    ic: "🏠",
    desc: "Alles aus Stufe 1 plus Malerarbeiten komplett, Bohrlöcher und Kleinteile — mit m²-Automatik als Fixpreis.",
    feats: [
      "Alles aus Übergabefertig",
      "Malerarbeiten komplett",
      "Bohrlöcher & Kleinteile",
      "m²-Automatik als Fixpreis",
    ],
    pop: true,
    angebot: false,
  },
  {
    id: 3,
    name: "Renoviert",
    produktSlug: "uebergabe-stufe-3",
    tint: "#F5F0E8",
    accent: "#8B6914",
    ic: "✨",
    desc: "Stufe 2 plus Module nach Bedarf — Boden, Bad-Auffrischung, Elektro-Sichtteile. Live-Indikation, verbindlich per Angebot.",
    feats: [
      "Alles aus Neuvermietungsfertig",
      "Module wählbar",
      "Live-Preisindikation",
      "Angebotsweg",
    ],
    pop: false,
    angebot: true,
  },
];

export type MieterwechselZubuchOption = {
  id: MieterwechselZubuchId;
  label: string;
  produktSlug: string;
  hint: string;
};

export const MIETERWECHSEL_ZUBUCH: MieterwechselZubuchOption[] = [
  {
    id: "endreinigung",
    label: "Endreinigung intensiv",
    produktSlug: "zubuch-endreinigung",
    hint: "nach Größenklasse",
  },
  {
    id: "entruempelung",
    label: "Entrümpelung",
    produktSlug: "zubuch-entruempelung",
    hint: "390 €",
  },
  {
    id: "kueche-demontage",
    label: "Küche Demontage",
    produktSlug: "zubuch-kueche-demontage",
    hint: "290 €",
  },
  {
    id: "kueche-montage",
    label: "Küche Montage",
    produktSlug: "zubuch-kueche-montage",
    hint: "690–1.490 €",
  },
];

export type MieterwechselModulOption = {
  id: MieterwechselModulId;
  label: string;
  produktSlug: string;
  hint: string;
};

export const MIETERWECHSEL_MODULE: MieterwechselModulOption[] = [
  {
    id: "boden",
    label: "Boden Vinyl/Laminat",
    produktSlug: "renovierung-boden-vinyl",
    hint: "45–75 €/m²",
  },
  {
    id: "bad",
    label: "Bad-Auffrischung",
    produktSlug: "renovierung-bad-auffrischung",
    hint: "800–2.500 €",
  },
  {
    id: "elektro",
    label: "Elektro-Sichtteile",
    produktSlug: "renovierung-elektro-sicht",
    hint: "600–1.800 €",
  },
];

export const MIETERWECHSEL_PAGE_TITLE = "Mieterwechsel" as const;
export const MIETERWECHSEL_PAGE_EYEBROW = "Turn-Paket" as const;
export const MIETERWECHSEL_INTRO =
  "Drei Stufen vom Übergabeprotokoll bis zur renovierten Wohnung — Fixpreise und Zubuch-Optionen aus dem Welle-3-Katalog. Zubuchbar auf jeder Stufe." as const;
export const MIETERWECHSEL_CTA_FIX = "Beauftragen" as const;
export const MIETERWECHSEL_CTA_ANGEBOT = "Angebot anfordern" as const;
export const MIETERWECHSEL_PREIS_HINWEIS =
  "Nettopreise München. Stufe 2 mit Wohnfläche = Fixpreis (Stufe 1 + 32 €/m²); ohne m² nur Band und Angebot. Stufe 3 und Montage immer Angebotsweg — Indikation live." as const;
export const MIETERWECHSEL_OK_TITLE = "Mieterwechsel angefragt" as const;
export const MIETERWECHSEL_OK_BODY =
  "Ihr Ansprechpartner bei Bärenwald meldet sich mit Termin, Objektbezug und verbindlichem Preis." as const;
export const MIETERWECHSEL_OK_CLOSE = "Schließen" as const;

export function mieterwechselOkHeadline(stufeName: string): string {
  return `„${stufeName}" angefragt`;
}

export function findMieterwechselGroesse(id: string) {
  return MIETERWECHSEL_GROESSEN.find((g) => g.id === id);
}

export function findMieterwechselStufe(id: MieterwechselStufeId) {
  return MIETERWECHSEL_STUFEN.find((s) => s.id === id);
}

function mid(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

export function resolveM2ForPreis(
  groesse: MieterwechselGroesseId,
  m2?: number | null
): { m2: number; exact: boolean } {
  if (m2 != null && m2 > 0) return { m2, exact: true };
  const g =
    findMieterwechselGroesse(groesse) ??
    findMieterwechselGroesse(MIETERWECHSEL_GROESSE_DEFAULT)!;
  return { m2: g.m2Hint, exact: false };
}

export function stufe1Preis(groesse: MieterwechselGroesseId): number {
  return STUFE1_FIX[groesse];
}

/** Stufe 2 Fixpreis nur bei bekannter Wohnfläche. */
export function stufe2Fixpreis(
  groesse: MieterwechselGroesseId,
  m2: number
): number {
  return stufe1Preis(groesse) + m2 * STUFE2_M2_SATZ;
}

export function zubuchPreis(
  id: MieterwechselZubuchId,
  groesse: MieterwechselGroesseId
): { min: number; max: number; fix: boolean } {
  switch (id) {
    case "endreinigung":
      return {
        min: ENDREINIGUNG_FIX[groesse],
        max: ENDREINIGUNG_FIX[groesse],
        fix: true,
      };
    case "entruempelung":
      return { min: ENTRUEMPELUNG_FIX, max: ENTRUEMPELUNG_FIX, fix: true };
    case "kueche-demontage":
      return {
        min: KUECHE_DEMONTAGE_FIX,
        max: KUECHE_DEMONTAGE_FIX,
        fix: true,
      };
    case "kueche-montage":
      return {
        min: KUECHE_MONTAGE_BAND.min,
        max: KUECHE_MONTAGE_BAND.max,
        fix: false,
      };
  }
}

export function modulPreis(
  id: MieterwechselModulId,
  m2: number
): { min: number; max: number } {
  switch (id) {
    case "boden":
      return { min: m2 * MODUL_BODEN_M2.min, max: m2 * MODUL_BODEN_M2.max };
    case "bad":
      return { min: MODUL_BAD_BAND.min, max: MODUL_BAD_BAND.max };
    case "elektro":
      return { min: MODUL_ELEKTRO_BAND.min, max: MODUL_ELEKTRO_BAND.max };
  }
}

export type MieterwechselPreisResult = {
  /** Untere Indikation / Fix. */
  min: number;
  /** Obere Indikation (bei Fix = min). */
  max: number;
  /** Verbindlicher Fixpreis möglich. */
  isFix: boolean;
  /** Anzeige-Label. */
  label: string;
  /** Kurz: Stufe ohne Zubuch/Module. */
  basisMin: number;
  basisMax: number;
};

export type MieterwechselPreisInput = {
  stufe: MieterwechselStufeId;
  groesse: MieterwechselGroesseId;
  /** Wohnfläche — für Stufe 2 Fix / Stufe 3 Indikation. */
  m2?: number | null;
  zubuch?: readonly MieterwechselZubuchId[];
  module?: readonly MieterwechselModulId[];
};

export function berechneMieterwechselPreis(
  input: MieterwechselPreisInput
): MieterwechselPreisResult {
  const { stufe, groesse } = input;
  const zubuch = input.zubuch ?? [];
  const module = input.module ?? [];
  const { m2, exact } = resolveM2ForPreis(groesse, input.m2);

  let basisMin = 0;
  let basisMax = 0;
  let isFix = false;

  if (stufe === 1) {
    basisMin = basisMax = stufe1Preis(groesse);
    isFix = true;
  } else if (stufe === 2) {
    if (exact) {
      basisMin = basisMax = stufe2Fixpreis(groesse, m2);
      isFix = true;
    } else {
      basisMin = stufe1Preis(groesse) + m2 * STUFE2_BAND.min;
      basisMax = stufe1Preis(groesse) + m2 * STUFE2_BAND.max;
      isFix = false;
    }
  } else {
    // Stufe 3 = Stufe 2 + Module (immer Angebot)
    if (exact) {
      basisMin = basisMax = stufe2Fixpreis(groesse, m2);
    } else {
      basisMin = stufe1Preis(groesse) + m2 * STUFE2_BAND.min;
      basisMax = stufe1Preis(groesse) + m2 * STUFE2_BAND.max;
    }
    for (const mod of module) {
      const p = modulPreis(mod, m2);
      basisMin += p.min;
      basisMax += p.max;
    }
    isFix = false;
  }

  let min = basisMin;
  let max = basisMax;
  let extrasFix = true;
  for (const z of zubuch) {
    const p = zubuchPreis(z, groesse);
    min += p.min;
    max += p.max;
    if (!p.fix) extrasFix = false;
  }

  const allFix = isFix && extrasFix && min === max;
  const label = formatMieterwechselPreis({ min, max, isFix: allFix });

  return {
    min,
    max,
    isFix: allFix,
    label,
    basisMin,
    basisMax,
  };
}

export function formatMieterwechselPreis(p: {
  min: number;
  max: number;
  isFix: boolean;
}): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n);
  if (p.isFix || p.min === p.max) return `${fmt(p.min)} €`;
  return `${fmt(p.min)}–${fmt(p.max)} €`;
}

export function formatMieterwechselPreisPrefix(p: MieterwechselPreisResult): string {
  if (p.isFix) return p.label;
  return `Indikation ${p.label}`;
}

export function mieterwechselCta(stufe: MieterwechselStufeId, isFix: boolean): string {
  if (stufe === 3 || !isFix) return MIETERWECHSEL_CTA_ANGEBOT;
  return MIETERWECHSEL_CTA_FIX;
}

/** Für API-Validierung. */
export function isMieterwechselGroesseId(v: string): v is MieterwechselGroesseId {
  return MIETERWECHSEL_GROESSEN.some((g) => g.id === v);
}

export function isMieterwechselStufeId(v: number): v is MieterwechselStufeId {
  return v === 1 || v === 2 || v === 3;
}

export function isMieterwechselZubuchId(v: string): v is MieterwechselZubuchId {
  return MIETERWECHSEL_ZUBUCH.some((z) => z.id === v);
}

export function isMieterwechselModulId(v: string): v is MieterwechselModulId {
  return MIETERWECHSEL_MODULE.some((m) => m.id === v);
}

/** Midpoint nur für Tests / CRM-Richtwert. */
export function mieterwechselRichtwert(p: MieterwechselPreisResult): number {
  return mid(p.min, p.max);
}
