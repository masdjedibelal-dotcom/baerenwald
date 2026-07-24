import { normalizeFunnelDaten } from "@/lib/lead-funnel-daten";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";

/** Heutiges Datum in Europe/Berlin (YYYY-MM-DD). */
export function partnerHeuteIsoBerlin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
}

function parseIsoDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const iso = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Zeitraum-Slug → Tage ab Versand bis geplanter Projektstart. */
function zeitraumSlugToStartOffsetDays(slug: string): number | null {
  const s = slug.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (!s) return null;

  if (
    s === "sofort" ||
    s === "heute" ||
    s === "notfall" ||
    s === "dringend" ||
    s === "heute_noch"
  ) {
    return 0;
  }
  if (s === "woche" || s === "diese_woche") return 0;
  if (s === "vier_wochen" || s === "innerhalb_4_wochen") return 28;
  if (s === "zwei_monate" || s === "in_1_2_monaten") return 60;
  if (s === "sechs_monate" || s === "in_3_6_monaten") return 90;
  if (s === "naechstes_jahr") return 365;
  if (s === "flexibel") return null;

  return null;
}

function resolveZeitraumSlug(
  zeitraum?: string | null,
  lead?: PortalAnfrageLeadSource | null
): string {
  const direct = zeitraum?.trim();
  if (direct) return direct;

  const fromLead = lead?.zeitraum?.trim();
  if (fromLead) return fromLead;

  const norm = normalizeFunnelDaten(lead?.funnel_daten, lead?.bereiche);
  return norm.zeitraum?.trim() || norm.dringlichkeit?.trim() || "";
}

/**
 * Geplanter Projektstart (YYYY-MM-DD).
 * Priorität: explizites start_datum → Zeitraum-Slug relativ zu gesendet_at.
 */
export function resolvePartnerAnfrageProjektStartIso(input: {
  gesendet_at?: string | null;
  zeitraum?: string | null;
  lead?: PortalAnfrageLeadSource | null;
  start_datum?: string | null;
  position_start_daten?: Array<string | null | undefined>;
}): string | null {
  const explicit = parseIsoDate(input.start_datum);
  if (explicit) return explicit;

  const positionStarts = (input.position_start_daten ?? [])
    .map((d) => parseIsoDate(d))
    .filter((d): d is string => Boolean(d))
    .sort();
  if (positionStarts[0]) return positionStarts[0];

  const ref =
    parseIsoDate(input.gesendet_at) ?? partnerHeuteIsoBerlin();
  const slug = resolveZeitraumSlug(input.zeitraum, input.lead);
  const offset = zeitraumSlugToStartOffsetDays(slug);
  if (offset == null) return null;

  return addDaysIso(ref, offset);
}

export function isProjektStartDatumErreicht(projektStartIso: string | null): boolean {
  if (!projektStartIso) return false;
  return partnerHeuteIsoBerlin() >= projektStartIso;
}
