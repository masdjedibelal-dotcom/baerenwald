import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

export type KundeAuftragAenderungTyp = "neu" | "geaendert" | "entfernt";

export type KundeAuftragPositionInput = {
  id: string;
  gewerk_name?: string | null;
  leistung_name?: string | null;
  beschreibung?: string | null;
  menge?: number | null;
  lohn_fix?: number | null;
  material_fix?: number | null;
  aenderung_typ?: KundeAuftragAenderungTyp | null;
  preis_alt?: number | null;
  kunde_akzeptiert_at?: string | null;
  handwerker_id?: string | null;
  handwerker_status?: string | null;
  leistung_status?: string | null;
};

export type PortalAuftragPositionDisplay = PortalAngebotPositionDisplay & {
  aenderungBadge?: KundeAuftragAenderungTyp;
  preisBruttoAlt?: number;
  entfernt?: boolean;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function mapAenderungTyp(raw?: string | null): KundeAuftragAenderungTyp | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "neu" || v === "geaendert" || v === "entfernt") return v;
  return null;
}

function nettoFromParts(lohn: number, material: number, menge: number): number {
  return round2((lohn + material) * Math.max(menge || 1, 0.0001));
}

function nettoFromAngebotRow(raw: Record<string, unknown>): number {
  const menge = Math.max(num(raw.menge) || 1, 0.0001);
  const vk = num(raw.vk_netto);
  if (vk > 0) return round2(vk * menge);

  const lohn = num(raw.lohn_netto);
  const mat = num(raw.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return round2(fromParts);

  return 0;
}

function bruttoFromNetto(netto: number, mwst = 19): number {
  if (netto <= 0) return 0;
  return round2(netto * (1 + mwst / 100));
}

function parseAngebotPositionenById(raw: unknown): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  if (!raw) return out;
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return out;
    }
  }
  if (!Array.isArray(data)) return out;
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    if (id) out.set(id, row);
  }
  return out;
}

function positionTitle(pos: KundeAuftragPositionInput): string {
  const leistung = stripHtmlToPlainText(String(pos.leistung_name ?? ""));
  if (leistung) return leistung;
  const gewerk = stripHtmlToPlainText(String(pos.gewerk_name ?? ""));
  return gewerk || "Leistung";
}

function resolvePositionNetto(
  pos: KundeAuftragPositionInput,
  angebotById: Map<string, Record<string, unknown>>
): number {
  const menge = Math.max(pos.menge ?? 1, 0.0001);
  const fromFix = nettoFromParts(pos.lohn_fix ?? 0, pos.material_fix ?? 0, menge);
  if (fromFix > 0) return fromFix;

  const angebotRow = angebotById.get(pos.id);
  if (angebotRow) return nettoFromAngebotRow(angebotRow);

  return 0;
}

export function positionBrauchtKundeAktion(
  pos: Pick<KundeAuftragPositionInput, "aenderung_typ" | "kunde_akzeptiert_at">
): boolean {
  const typ = mapAenderungTyp(pos.aenderung_typ ?? null);
  if (!typ) return false;
  return !pos.kunde_akzeptiert_at?.trim();
}

export function hatOffeneKundeAuftragAenderung(
  positionen: KundeAuftragPositionInput[] | null | undefined
): boolean {
  return (positionen ?? []).some(positionBrauchtKundeAktion);
}

export function buildKundeAuftragPositionenDisplay(
  positionen: KundeAuftragPositionInput[],
  angebotPositionenRaw?: unknown
): PortalAuftragPositionDisplay[] {
  const angebotById = parseAngebotPositionenById(angebotPositionenRaw);
  const out: PortalAuftragPositionDisplay[] = [];

  for (const pos of positionen) {
    const typ = mapAenderungTyp(pos.aenderung_typ ?? null);
    const title = positionTitle(pos);
    const beschreibung =
      pos.beschreibung && pos.beschreibung !== title
        ? stripHtmlToPlainText(pos.beschreibung)
        : undefined;
    const netto = resolvePositionNetto(pos, angebotById);
    const preisBrutto = bruttoFromNetto(netto);
    const altNetto =
      pos.preis_alt != null && pos.preis_alt > 0 ? round2(pos.preis_alt) : null;
    const preisBruttoAlt =
      typ === "geaendert" && altNetto != null ? bruttoFromNetto(altNetto) : undefined;
    const isEntfernt = typ === "entfernt";
    const displayBrutto =
      isEntfernt && preisBrutto <= 0 && altNetto != null
        ? bruttoFromNetto(altNetto)
        : preisBrutto;

    out.push({
      id: pos.id,
      title,
      beschreibung,
      preisBrutto: displayBrutto,
      preisBruttoAlt,
      aenderungBadge: typ ?? undefined,
      entfernt: isEntfernt,
    });
  }

  return out;
}

export function resolveKundeAuftragGesamtBrutto(
  items: PortalAuftragPositionDisplay[]
): number | undefined {
  const active = items.filter((p) => !p.entfernt && p.preisBrutto > 0);
  if (!active.length) return undefined;
  return round2(active.reduce((s, p) => s + p.preisBrutto, 0));
}

export function mapPortalAuftragPositionRow(
  raw: Record<string, unknown>
): KundeAuftragPositionInput {
  return {
    id: String(raw.id),
    gewerk_name: (raw.gewerk_name as string | null) ?? null,
    leistung_name: (raw.leistung_name as string | null) ?? null,
    beschreibung: (raw.beschreibung as string | null) ?? null,
    menge: raw.menge != null ? Number(raw.menge) : null,
    lohn_fix: raw.lohn_fix != null ? Number(raw.lohn_fix) : null,
    material_fix: raw.material_fix != null ? Number(raw.material_fix) : null,
    aenderung_typ: mapAenderungTyp(raw.aenderung_typ as string | null),
    preis_alt: raw.preis_alt != null ? Number(raw.preis_alt) : null,
    kunde_akzeptiert_at: (raw.kunde_akzeptiert_at as string | null) ?? null,
  };
}
