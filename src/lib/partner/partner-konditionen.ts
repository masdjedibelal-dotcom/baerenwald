import type { PartnerAngebotPositionenFilter } from "@/lib/partner/partner-leistungen-display";

const SKIP_POSITION_SLUGS = new Set(["__freitext__", "__gesamtrabatt__"]);

export const PARTNER_KONDITION_MWST = 19;

export type PartnerKonditionZeile = {
  id: string;
  title: string;
  beschreibung?: string;
  /** Einkaufspreis-Vorschlag von Bärenwald (netto Zeile). null = Preis folgt */
  vorschlagNetto: number | null;
  /** Vom Handwerker eingereicht / vereinbart (netto Zeile). */
  hwNetto?: number | null;
  mwstSatz: number;
  geaendert?: boolean;
};

export type PartnerHwKonditionPosition = {
  position_id: string;
  leistung: string;
  beschreibung?: string;
  ek_netto: number | null;
  hw_netto: number;
  mwst_satz: number;
  geaendert: boolean;
};

export type PartnerHwKonditionen = {
  art: "bestaetigt" | "gegenvorschlag";
  positionen: PartnerHwKonditionPosition[];
  eingereicht_at?: string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveMwstSatz(raw: Record<string, unknown>): number {
  const mwst = num(raw.mwst_satz);
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst;
  return PARTNER_KONDITION_MWST;
}

function positionTitle(raw: Record<string, unknown>): string {
  const leistung = String(raw.leistung ?? raw.leistung_name ?? "").trim();
  if (leistung) return leistung;
  return String(raw.gewerk_name ?? "Leistung").trim() || "Leistung";
}

function positionBeschreibung(raw: Record<string, unknown>, title: string): string | undefined {
  const besch = String(raw.beschreibung ?? raw.notiz_extern ?? "").trim();
  if (!besch || besch === title) return undefined;
  return besch;
}

function vorschlagNettoFromRow(raw: Record<string, unknown>): number | null {
  const menge = Math.max(num(raw.menge) || 1, 0.0001);
  const ek = num(raw.einkaufspreis);
  if (ek > 0) return round2(ek * menge);
  const lohn = num(raw.lohn_netto);
  const mat = num(raw.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return round2(fromParts);
  return null;
}

export function parsePartnerHwKonditionen(raw: unknown): PartnerHwKonditionen | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const art = o.art === "gegenvorschlag" ? "gegenvorschlag" : "bestaetigt";
  const posRaw = o.positionen;
  if (!Array.isArray(posRaw)) return null;
  const positionen: PartnerHwKonditionPosition[] = [];
  for (const item of posRaw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const hw = num(p.hw_netto);
    if (hw < 0) continue;
    positionen.push({
      position_id: String(p.position_id ?? ""),
      leistung: String(p.leistung ?? "Leistung").trim() || "Leistung",
      beschreibung:
        typeof p.beschreibung === "string" ? p.beschreibung.trim() || undefined : undefined,
      ek_netto:
        p.ek_netto == null ? null : num(p.ek_netto) > 0 ? round2(num(p.ek_netto)) : null,
      hw_netto: round2(hw),
      mwst_satz: resolveMwstSatz(p),
      geaendert: Boolean(p.geaendert),
    });
  }
  if (!positionen.length) return null;
  return {
    art,
    positionen,
    eingereicht_at:
      typeof o.eingereicht_at === "string" ? o.eingereicht_at : undefined,
  };
}

function isPreisPosition(raw: Record<string, unknown>): boolean {
  const slug = String(raw.gewerk_slug ?? "");
  if (SKIP_POSITION_SLUGS.has(slug)) return false;
  return Boolean(
    String(raw.leistung ?? raw.leistung_name ?? "").trim() ||
      String(raw.gewerk_id ?? "").trim() ||
      slug
  );
}

function parsePositionenArray(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function filterPositionenRaw(
  raw: unknown,
  filter?: PartnerAngebotPositionenFilter
): Record<string, unknown>[] {
  const gewerkId = filter?.gewerkId?.trim() || "";
  const handwerkerId = filter?.handwerkerId?.trim() || "";
  return parsePositionenArray(raw).filter((row) => {
    if (!isPreisPosition(row)) return false;
    const rowGewerk = String(row.gewerk_id ?? "").trim();
    if (gewerkId && rowGewerk && rowGewerk !== gewerkId) return false;
    const rowHw = String(row.handwerker_id ?? "").trim();
    if (handwerkerId && rowHw && rowHw !== handwerkerId) return false;
    return true;
  });
}

export function buildPartnerKonditionZeilen(
  positionenRaw: unknown,
  filter?: PartnerAngebotPositionenFilter
): PartnerKonditionZeile[] {
  return filterPositionenRaw(positionenRaw, filter).map((row, i) => {
    const title = positionTitle(row);
    return {
      id: String(row.id ?? `pos-${i}`),
      title,
      beschreibung: positionBeschreibung(row, title),
      vorschlagNetto: vorschlagNettoFromRow(row),
      mwstSatz: resolveMwstSatz(row),
    };
  });
}

export function mergeKonditionZeilenMitHw(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): PartnerKonditionZeile[] {
  if (!hw?.positionen.length) return zeilen;
  const byId = new Map(hw.positionen.map((p) => [p.position_id, p]));
  return zeilen.map((z) => {
    const submitted = byId.get(z.id);
    if (!submitted) return z;
    return {
      ...z,
      hwNetto: submitted.hw_netto,
      geaendert: submitted.geaendert,
      vorschlagNetto: submitted.ek_netto ?? z.vorschlagNetto,
    };
  });
}

export function konditionZeilenNurAusHw(
  hw: PartnerHwKonditionen | null | undefined
): PartnerKonditionZeile[] {
  if (!hw?.positionen.length) return [];
  return hw.positionen.map((p) => ({
    id: p.position_id,
    title: p.leistung,
    beschreibung: p.beschreibung,
    vorschlagNetto: p.ek_netto,
    hwNetto: p.hw_netto,
    mwstSatz: p.mwst_satz,
    geaendert: p.geaendert,
  }));
}

export function summeKonditionNetto(
  zeilen: Array<{ hwNetto?: number | null; vorschlagNetto?: number | null }>,
  useHw = false
): number {
  let sum = 0;
  for (const z of zeilen) {
    const n = useHw
      ? z.hwNetto != null
        ? z.hwNetto
        : z.vorschlagNetto
      : z.vorschlagNetto;
    if (n != null && n > 0) sum += n;
  }
  return round2(sum);
}

export function summeKonditionBrutto(
  zeilen: PartnerKonditionZeile[],
  useHw = false
): number {
  let sum = 0;
  for (const z of zeilen) {
    const netto = useHw
      ? z.hwNetto != null
        ? z.hwNetto
        : z.vorschlagNetto
      : z.vorschlagNetto;
    if (netto == null || netto <= 0) continue;
    sum += round2(netto * (1 + z.mwstSatz / 100));
  }
  return round2(sum);
}

export function buildHwKonditionenPayload(
  zeilen: PartnerKonditionZeile[],
  hwNettoById: Record<string, number>
): PartnerHwKonditionen {
  const positionen: PartnerHwKonditionPosition[] = zeilen.map((z) => {
    const hw_netto = round2(hwNettoById[z.id] ?? 0);
    const ek = z.vorschlagNetto;
    const geaendert =
      ek != null && ek > 0 ? Math.abs(hw_netto - ek) > 0.009 : hw_netto > 0;
    return {
      position_id: z.id,
      leistung: z.title,
      beschreibung: z.beschreibung,
      ek_netto: ek,
      hw_netto,
      mwst_satz: z.mwstSatz,
      geaendert,
    };
  });
  const art = positionen.every((p) => !p.geaendert) ? "bestaetigt" : "gegenvorschlag";
  return {
    art,
    positionen,
    eingereicht_at: new Date().toISOString(),
  };
}

export function initialHwNettoInputs(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): Record<string, string> {
  const out: Record<string, string> = {};
  const submitted = new Map(hw?.positionen.map((p) => [p.position_id, p.hw_netto]));
  for (const z of zeilen) {
    const fromHw = submitted.get(z.id);
    if (fromHw != null && fromHw > 0) {
      out[z.id] = String(fromHw).replace(".", ",");
      continue;
    }
    if (z.vorschlagNetto != null && z.vorschlagNetto > 0) {
      out[z.id] = String(z.vorschlagNetto).replace(".", ",");
    } else {
      out[z.id] = "";
    }
  }
  return out;
}

export function parseHwNettoInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}
