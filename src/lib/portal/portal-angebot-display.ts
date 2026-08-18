import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import {
  buildAnfragePersonalSection,
  formatAnfrageListOrtLine,
  formatAnfrageWasGemacht,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { portalObjektSection } from "@/lib/portal/portal-objekt";
import { fmtPortalDate } from "@/lib/shared/portal-detail-format";

/**
 * Angebotsposition für Portal-Übersicht — analog CRM-Leistungen-Tab
 * (Bezeichnung, Gewerk, Menge/Einheit, Preis).
 */
export type PortalAngebotPositionDisplay = {
  id: string;
  title: string;
  beschreibung?: string;
  /** Gewerk-Name (CRM-Subline) */
  gewerk?: string;
  menge?: number;
  einheit?: string;
  /** Anzeige z. B. „12 m²“ */
  mengeLabel?: string;
  /** Zeilensumme brutto inkl. MwSt. (Kunden-/HV-Ansicht) */
  preisBrutto: number;
  /** Zeilensumme netto (wie CRM Leistungen-Tab) */
  preisNetto?: number;
};

const SKIP_POSITION_SLUGS = new Set(["__freitext__", "__gesamtrabatt__"]);
const GEWERK_BESCHREIBUNG_TITEL = "__gewerk_beschreibung__";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function resolveMwstSatz(raw: Record<string, unknown>, fallback = 19): number {
  const mwst = num(raw.mwst_satz);
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst;
  return fallback;
}

/** Netto-Zeile wie CRM `angebotPreis` / positionVkNettoStueck × Menge. */
function positionNettoZeile(raw: Record<string, unknown>): number {
  const menge = Math.max(num(raw.menge) || 1, 0.0001);
  const vk = num(raw.vk_netto);
  if (vk > 0) return Math.round(vk * menge * 100) / 100;

  const lohn = num(raw.lohn_netto);
  const mat = num(raw.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return Math.round(fromParts * 100) / 100;

  const gesamt = num(raw.gesamt_min);
  if (gesamt > 0) return Math.round(gesamt * 100) / 100;

  const preisMin = num(raw.preis_min);
  const preisMax = num(raw.preis_max);
  if (preisMin > 0 || preisMax > 0) {
    const mid =
      preisMax > preisMin ? (preisMin + preisMax) / 2 : Math.max(preisMin, preisMax);
    return Math.round(mid * 100) / 100;
  }

  return 0;
}

function positionBruttoZeile(raw: Record<string, unknown>, defaultMwst = 19): number {
  const netto = positionNettoZeile(raw);
  if (netto <= 0) return 0;
  const mwst = resolveMwstSatz(raw, defaultMwst);
  return Math.round(netto * (1 + mwst / 100) * 100) / 100;
}

/** CRM: leistung_name || leistung */
function positionTitle(raw: Record<string, unknown>): string {
  const leistungName = stripHtmlToPlainText(
    String(raw.leistung_name ?? raw.leistung ?? "")
  );
  if (leistungName && leistungName.toLowerCase() !== GEWERK_BESCHREIBUNG_TITEL) {
    return leistungName;
  }
  return stripHtmlToPlainText(String(raw.gewerk_name ?? "Leistung")) || "Leistung";
}

function positionBeschreibung(
  raw: Record<string, unknown>,
  title: string
): string | undefined {
  const besch = stripHtmlToPlainText(
    String(raw.beschreibung ?? raw.notiz_extern ?? "")
  );
  if (!besch || besch === title) return undefined;
  return besch;
}

function formatMengeLabel(
  menge: number | undefined,
  einheit: string | undefined
): string | undefined {
  if (menge == null && !einheit) return undefined;
  const m = menge ?? 1;
  const e = (einheit ?? "").trim();
  if (!e) return String(m);
  if (e.toLowerCase() === "pauschal") return `${m} pauschal`;
  return `${m} ${e}`.trim();
}

function gewerkAnzeige(raw: Record<string, unknown>): string | undefined {
  const n = stripHtmlToPlainText(String(raw.gewerk_name ?? "")).trim();
  if (!n || n === "Freitext") return undefined;
  return n;
}

/** Wie CRM: Freitext-/Rabatt-/Gewerk-Beschreibungszeilen ausblenden. */
function isKundenLeistungPosition(raw: Record<string, unknown>): boolean {
  const slug = String(raw.gewerk_slug ?? "").trim();
  if (SKIP_POSITION_SLUGS.has(slug)) {
    const leistung = String(raw.leistung ?? raw.leistung_name ?? "")
      .trim()
      .toLowerCase();
    // Reine Gewerk-Beschreibung (Wizard-Intern) nie anzeigen
    if (leistung === GEWERK_BESCHREIBUNG_TITEL) return false;
    // __freitext__ / __gesamtrabatt__ selbst nicht als Leistung
    return false;
  }
  if (
    String(raw.leistung ?? raw.leistung_name ?? "")
      .trim()
      .toLowerCase() === GEWERK_BESCHREIBUNG_TITEL
  ) {
    return false;
  }
  return Boolean(
    String(raw.leistung ?? raw.leistung_name ?? "").trim() ||
      String(raw.gewerk_id ?? "").trim() ||
      String(raw.gewerk_name ?? "").trim() ||
      slug
  );
}

/**
 * Angebots-`positionen` JSON → Portal-Leistungszeilen (CRM-Parität).
 * Auch Positionen ohne Preis (dann „Preis folgt“ in der UI).
 */
export function parseAngebotPositionenMitPreis(
  raw: unknown,
  defaultMwst = 19
): PortalAngebotPositionDisplay[] {
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

  const out: PortalAngebotPositionDisplay[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isKundenLeistungPosition(row)) continue;

    const title = positionTitle(row);
    const preisNetto = positionNettoZeile(row);
    const preisBrutto = positionBruttoZeile(row, defaultMwst);
    const mengeRaw = num(row.menge);
    const menge = mengeRaw > 0 ? mengeRaw : undefined;
    const einheit = String(row.einheit ?? "").trim() || undefined;
    const gewerk = gewerkAnzeige(row);

    out.push({
      id: String(row.id ?? `${title}-${out.length}`),
      title,
      beschreibung: positionBeschreibung(row, title),
      gewerk,
      menge,
      einheit,
      mengeLabel: formatMengeLabel(menge, einheit),
      preisBrutto,
      preisNetto: preisNetto > 0 ? preisNetto : undefined,
    });
  }
  return out;
}

export function resolveAngebotGesamtBrutto(opts: {
  positionen?: unknown;
  gesamt_fix?: number | null;
  gesamt_min?: number | null;
  gesamt_max?: number | null;
  defaultMwst?: number;
}): number | undefined {
  const defaultMwst = opts.defaultMwst ?? 19;
  const parsed = parseAngebotPositionenMitPreis(opts.positionen, defaultMwst);
  const withPrice = parsed.filter((p) => p.preisBrutto > 0);
  if (withPrice.length) {
    const sum = withPrice.reduce((s, p) => s + p.preisBrutto, 0);
    return Math.round(sum * 100) / 100;
  }

  const netto =
    typeof opts.gesamt_fix === "number" && opts.gesamt_fix > 0
      ? opts.gesamt_fix
      : typeof opts.gesamt_max === "number" && opts.gesamt_max > 0
        ? opts.gesamt_max
        : typeof opts.gesamt_min === "number" && opts.gesamt_min > 0
          ? opts.gesamt_min
          : undefined;

  if (netto == null) return undefined;
  return Math.round(netto * (1 + defaultMwst / 100) * 100) / 100;
}

export function buildAngebotCardMeta(
  lead: PortalAnfrageLeadSource | null | undefined,
  createdAt?: string | null
): PortalListCardMeta[] {
  const meta: PortalListCardMeta[] = [];
  if (lead) {
    const was = formatAnfrageWasGemacht(lead);
    if (was) meta.push({ icon: "hammer", text: was });
    const ortLine = formatAnfrageListOrtLine(lead);
    if (ortLine !== "—") meta.push({ icon: "map-pin", text: ortLine });
  }
  const dateLabel = fmtPortalDate(createdAt);
  if (dateLabel !== "—") meta.push({ icon: "calendar", text: dateLabel });
  return meta;
}

export function buildAngebotPortalSections(opts: {
  lead: PortalAnfrageLeadSource | null | undefined;
  objekt: PortalObjekt | null | undefined;
}): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];
  if (opts.objekt) sections.push(portalObjektSection(opts.objekt));
  if (opts.lead) {
    const personal = buildAnfragePersonalSection(opts.lead);
    if (personal) sections.push(personal);
  }
  return sections;
}
