import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import type { PartnerKonditionZeile } from "@/lib/partner/partner-konditionen";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

export type PartnerAngebotPositionenFilter = {
  gewerkId?: string | null;
  handwerkerId?: string | null;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function resolveMwstSatz(raw: Record<string, unknown>, fallback = 19): number {
  const mwst = num(raw.mwst_satz);
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst;
  return fallback;
}

/** Handwerker-Vergütung netto je Zeile (EK, nicht Verkaufspreis). */
function positionPartnerNettoZeile(raw: Record<string, unknown>): number {
  const menge = Math.max(num(raw.menge) || 1, 0.0001);
  const ek = num(raw.einkaufspreis);
  if (ek > 0) return Math.round(ek * menge * 100) / 100;

  const lohn = num(raw.lohn_netto);
  const mat = num(raw.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return Math.round(fromParts * 100) / 100;

  return 0;
}

function positionPartnerBruttoZeile(raw: Record<string, unknown>, defaultMwst = 19): number {
  const netto = positionPartnerNettoZeile(raw);
  if (netto <= 0) return 0;
  const mwst = resolveMwstSatz(raw, defaultMwst);
  return Math.round(netto * (1 + mwst / 100) * 100) / 100;
}

function positionTitle(raw: Record<string, unknown>): string {
  const leistung = stripHtmlToPlainText(String(raw.leistung ?? raw.leistung_name ?? ""));
  if (leistung) return leistung;
  return stripHtmlToPlainText(String(raw.gewerk_name ?? "Leistung")) || "Leistung";
}

function positionBeschreibung(
  raw: Record<string, unknown>,
  title: string
): string | undefined {
  const besch = stripHtmlToPlainText(String(raw.beschreibung ?? raw.notiz_extern ?? ""));
  if (!besch || besch === title) return undefined;
  return besch;
}

function isPreisPosition(raw: Record<string, unknown>): boolean {
  const slug = String(raw.gewerk_slug ?? "");
  if (slug === "__freitext__" || slug === "__gesamtrabatt__") return false;
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

export function filterPartnerAngebotPositionenRaw(
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

export function parsePartnerAngebotPositionenMitPreis(
  raw: unknown,
  filter?: PartnerAngebotPositionenFilter,
  defaultMwst = 19
) {
  const out: Array<{
    id: string;
    title: string;
    beschreibung?: string;
    preisBrutto: number;
  }> = [];
  for (const row of filterPartnerAngebotPositionenRaw(raw, filter)) {
    const title = positionTitle(row);
    const preisBrutto = positionPartnerBruttoZeile(row, defaultMwst);
    if (preisBrutto <= 0) continue;
    out.push({
      id: String(row.id ?? `${title}-${out.length}`),
      title,
      beschreibung: positionBeschreibung(row, title),
      preisBrutto,
    });
  }
  return out;
}

export function resolvePartnerAngebotGesamtBrutto(
  raw: unknown,
  filter?: PartnerAngebotPositionenFilter,
  defaultMwst = 19
): number | undefined {
  const parsed = parsePartnerAngebotPositionenMitPreis(raw, filter, defaultMwst);
  if (!parsed.length) return undefined;
  const sum = parsed.reduce((s, p) => s + p.preisBrutto, 0);
  return Math.round(sum * 100) / 100;
}

export function buildPartnerAuftragKonditionZeilen(
  positionen: PartnerAuftragPosition[]
): PartnerKonditionZeile[] {
  return positionen.map((pos) => {
    const title =
      [pos.gewerk_name, pos.leistung_name].filter(Boolean).join(" — ") || "Leistung";
    const partnerNetto =
      pos.preis_partner != null && pos.preis_partner > 0
        ? pos.preis_partner
        : (pos.lohn_fix ?? 0) + (pos.material_fix ?? 0) > 0
          ? Math.round(((pos.lohn_fix ?? 0) + (pos.material_fix ?? 0)) * 100) / 100
          : null;
    const typ = pos.aenderung_typ ?? null;
    const isEntfernt = typ === "entfernt";
    const isGeaendert = typ === "geaendert";
    const isNeu = typ === "neu";
    const preisAlt =
      pos.preis_alt != null && pos.preis_alt > 0 ? pos.preis_alt : null;

    const menge =
      pos.menge != null && Number.isFinite(pos.menge)
        ? String(pos.menge).replace(".", ",")
        : null;
    const einheit = pos.einheit?.trim() || null;
    const mengeLine = [menge, einheit].filter(Boolean).join(" ");
    const gewerk = pos.gewerk_name?.trim() || null;
    const meta = [mengeLine || null, gewerk].filter(Boolean).join(" · ") || undefined;

    return {
      id: pos.id,
      title: pos.leistung_name?.trim() || title,
      beschreibung:
        pos.beschreibung && pos.beschreibung !== title ? pos.beschreibung : undefined,
      meta,
      vorschlagNetto: isEntfernt ? preisAlt ?? partnerNetto : partnerNetto,
      hwNetto: isEntfernt ? undefined : partnerNetto ?? undefined,
      vorherNetto: isGeaendert ? preisAlt : undefined,
      geaendert: isGeaendert,
      readonly: isEntfernt,
      zeilenBadge: isEntfernt
        ? "entfernt"
        : isGeaendert
          ? "geaendert"
          : isNeu
            ? "neu"
            : undefined,
      mwstSatz: 19,
    };
  });
}

function auftragPositionPartnerBrutto(pos: PartnerAuftragPosition, defaultMwst = 19): number {
  let netto = 0;
  if (pos.preis_partner != null && pos.preis_partner > 0) {
    netto = pos.preis_partner;
  } else {
    netto = (pos.lohn_fix ?? 0) + (pos.material_fix ?? 0);
  }
  netto = Math.round(netto * 100) / 100;
  if (netto <= 0) return 0;
  return Math.round(netto * (1 + defaultMwst / 100) * 100) / 100;
}

export function mapPartnerAuftragPositionenMitPreis(
  positionen: PartnerAuftragPosition[],
  defaultMwst = 19
) {
  const out: Array<{
    id: string;
    title: string;
    beschreibung?: string;
    preisBrutto: number;
  }> = [];
  for (const pos of positionen) {
    const title =
      [pos.gewerk_name, pos.leistung_name].filter(Boolean).join(" — ") || "Leistung";
    const preisBrutto = auftragPositionPartnerBrutto(pos, defaultMwst);
    if (preisBrutto <= 0) continue;
    const beschreibung =
      pos.beschreibung && pos.beschreibung !== title ? pos.beschreibung : undefined;
    out.push({
      id: pos.id,
      title,
      beschreibung,
      preisBrutto,
    });
  }
  return out;
}

export function resolvePartnerAuftragGesamtBrutto(
  positionen: PartnerAuftragPosition[],
  defaultMwst = 19
): number | undefined {
  const parsed = mapPartnerAuftragPositionenMitPreis(positionen, defaultMwst);
  if (!parsed.length) return undefined;
  const sum = parsed.reduce((s, p) => s + p.preisBrutto, 0);
  return Math.round(sum * 100) / 100;
}
