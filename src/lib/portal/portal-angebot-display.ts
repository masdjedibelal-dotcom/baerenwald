import { Calendar, Hammer, MapPin } from "lucide-react";

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

export type PortalAngebotPositionDisplay = {
  id: string;
  title: string;
  beschreibung?: string;
  preisBrutto: number;
};

const SKIP_POSITION_SLUGS = new Set(["__freitext__", "__gesamtrabatt__"]);

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function resolveMwstSatz(raw: Record<string, unknown>, fallback = 19): number {
  const mwst = num(raw.mwst_satz);
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst;
  return fallback;
}

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
  if (SKIP_POSITION_SLUGS.has(slug)) return false;
  return Boolean(
    String(raw.leistung ?? raw.leistung_name ?? "").trim() ||
      String(raw.gewerk_id ?? "").trim() ||
      slug
  );
}

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
    if (!isPreisPosition(row)) continue;
    const title = positionTitle(row);
    const preisBrutto = positionBruttoZeile(row, defaultMwst);
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

export function resolveAngebotGesamtBrutto(opts: {
  positionen?: unknown;
  gesamt_fix?: number | null;
  gesamt_min?: number | null;
  gesamt_max?: number | null;
  defaultMwst?: number;
}): number | undefined {
  const defaultMwst = opts.defaultMwst ?? 19;
  const parsed = parseAngebotPositionenMitPreis(opts.positionen, defaultMwst);
  if (parsed.length) {
    const sum = parsed.reduce((s, p) => s + p.preisBrutto, 0);
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
    if (was) meta.push({ icon: Hammer, text: was });
    const ortLine = formatAnfrageListOrtLine(lead);
    if (ortLine !== "—") meta.push({ icon: MapPin, text: ortLine });
  }
  const dateLabel = fmtPortalDate(createdAt);
  if (dateLabel !== "—") meta.push({ icon: Calendar, text: dateLabel });
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
