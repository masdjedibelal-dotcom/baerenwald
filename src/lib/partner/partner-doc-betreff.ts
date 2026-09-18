import { BEREICH_LABELS, labelBereich, labelSituation } from "@/lib/lead-funnel-labels";

/** Typische Funnel-/Bereichs-Slugs (snake_case), keine lesbaren Titel. */
export function isPartnerDocSlugTitel(raw: string | null | undefined): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return true;
  if (/\s/.test(t)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(t)) return true;
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/i.test(t)) return true;
  if (/^[a-z][a-z0-9]{2,40}$/i.test(t) && BEREICH_LABELS[t.toLowerCase()]) {
    return true;
  }
  return false;
}

/** Slug → Anzeige. */
export function partnerDocLabelFromSlug(slug: string): string {
  const key = slug.trim();
  if (!key) return "";
  const lower = key.toLowerCase();
  if (BEREICH_LABELS[lower]) return BEREICH_LABELS[lower]!;
  const bereich = labelBereich(key);
  if (bereich && bereich !== key.replace(/_/g, " ")) return bereich;
  const sit = labelSituation(key);
  if (sit && sit !== key) return sit;
  return key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Lesbarer Betreff für Partner-Angebot/-Rechnung.
 * Keine Funnel-IDs wie `fenster_tuer` — Auftragstitel oder Label.
 */
export function resolvePartnerDocBetreff(input: {
  auftragTitel?: string | null;
  projektbeschreibung?: string | null;
  gewerkName?: string | null;
  bereiche?: string[] | null;
  situation?: string | null;
  fallback?: string | null;
}): string {
  const fallback = input.fallback?.trim() || "Partnerleistung";

  const candidates = [input.auftragTitel, input.projektbeschreibung];
  for (const c of candidates) {
    const t = String(c ?? "").trim();
    if (!t) continue;
    if (!isPartnerDocSlugTitel(t)) return t;
    return partnerDocLabelFromSlug(t);
  }

  const bereich = input.bereiche?.find((b) => String(b ?? "").trim());
  if (bereich) {
    const label = partnerDocLabelFromSlug(String(bereich));
    if (label) return label;
  }

  const sit = String(input.situation ?? "").trim();
  if (sit) {
    const label = partnerDocLabelFromSlug(sit);
    if (label) return label;
  }

  const gw = String(input.gewerkName ?? "").trim();
  if (gw) return gw;

  return fallback;
}
