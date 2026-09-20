import { PALETTE } from "@/lib/tokens/palette";
export function fmtPortalDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

export function fmtPortalRelativeTime(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return "in Kürze";
  if (days === 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  if (days < 14) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `vor ${weeks} Wochen`;
  const months = Math.floor(days / 30);
  if (months < 12) return `vor ${months} Monaten`;
  return fmtPortalDate(v);
}

export function fmtPortalOrt(plz: string, ort: string): string {
  if (plz === "—" && ort === "—") return "—";
  if (ort === "—") return plz;
  return `${plz} · ${ort}`;
}

export function fmtPortalMetaLine(opts: {
  plz: string;
  ort: string;
  date?: string | null;
}): string {
  const ort = fmtPortalOrt(opts.plz, opts.ort);
  const rel = fmtPortalRelativeTime(opts.date);
  if (rel && ort !== "—") return `${ort}  ·  ${rel}`;
  if (rel) return rel;
  return ort;
}

export function fmtPortalEuro(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

export function portalDetailStatusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (
    s === "akzeptiert" ||
    s === "eingereicht" ||
    s === "abgeschlossen" ||
    s === "erledigt" ||
    s === "uebernommen" ||
    s.includes("abgeschlossen") ||
    s.includes("fertig")
  ) {
    return "tag bg-p2-primary-soft text-p2-primary";
  }
  if (s === "abgelehnt" || s === "storniert" || s === "antwort_abgelaufen") {
    return "tag bg-p2-danger-soft text-p2-danger";
  }
  if (s === "geaendert" || s === "ergaenzung" || s.includes("geändert")) {
    return "tag bg-p2-bg text-p2-ink";
  }
  if (s === "neu") {
    return "tag bg-warning-bg text-warning-text";
  }
  if (s === "bautagebuch" || s.includes("tagebuch")) {
    return "tag bg-warning-bg text-warning-text";
  }
  if (
    s === "in_arbeit" ||
    s === "abnahme" ||
    s === "termin" ||
    s === "auftrag" ||
    s === "beauftragt" ||
    s === "durchfuehrung" ||
    s.includes("arbeit") ||
    s.includes("aktiv")
  ) {
    return "tag bg-p2-bg text-p2-ink";
  }
  if (s.includes("angebot") || s.includes("gesendet") || s.includes("entwurf")) {
    return "tag bg-warning-bg text-warning-text";
  }
  return "tag bg-muted text-text-secondary";
}

/** Inline-Styles im PORTAL_STATUS-Look (Partner-/Detail-Chips). */
export function portalDetailStatusPillStyle(status: string): {
  color: string;
  backgroundColor: string;
} {
  const s = status.toLowerCase();
  if (
    s === "akzeptiert" ||
    s === "eingereicht" ||
    s === "abgeschlossen" ||
    s === "erledigt" ||
    s === "uebernommen" ||
    s === "angenommen" ||
    s.includes("abgeschlossen") ||
    s.includes("fertig")
  ) {
    return { color: PALETTE.h4b5563, backgroundColor: "var(--p2-status-done-bg)" };
  }
  if (s === "abgelehnt" || s === "storniert" || s === "antwort_abgelaufen") {
    return { color: PALETTE.hb91c1c, backgroundColor: PALETTE.hfee2e2 };
  }
  if (s === "geaendert" || s === "ergaenzung" || s.includes("geändert")) {
    return { color: PALETTE.h6d28d9, backgroundColor: PALETTE.hede9fe };
  }
  if (s === "neu" || s === "aktion") {
    return { color: "var(--p2-status-new)", backgroundColor: "var(--p2-status-new-bg)" };
  }
  if (s === "bautagebuch" || s.includes("tagebuch")) {
    return { color: "var(--p2-sand-text)", backgroundColor: "var(--p2-status-sand-bg)" };
  }
  if (
    s === "in_arbeit" ||
    s === "abnahme" ||
    s === "termin" ||
    s === "auftrag" ||
    s === "beauftragt" ||
    s === "durchfuehrung" ||
    s.includes("arbeit") ||
    s.includes("aktiv")
  ) {
    return { color: "var(--p2-status-blue)", backgroundColor: "var(--p2-status-blue-bg)" };
  }
  if (s.includes("angebot") || s.includes("gesendet") || s.includes("entwurf")) {
    return { color: "var(--p2-sand-text)", backgroundColor: "var(--p2-status-sand-bg)" };
  }
  return { color: PALETTE.h4b5563, backgroundColor: "var(--p2-status-done-bg)" };
}

/** @deprecated Alias für Partner-Importe */
export const fmtPartnerDate = fmtPortalDate;
/** @deprecated Alias für Partner-Importe */
export const fmtPartnerRelativeTime = fmtPortalRelativeTime;
/** @deprecated Alias für Partner-Importe */
export const fmtPartnerOrt = fmtPortalOrt;
/** @deprecated Alias für Partner-Importe */
export const fmtPartnerMetaLine = fmtPortalMetaLine;
/** @deprecated Alias für Partner-Importe */
export const fmtPartnerEuro = fmtPortalEuro;
/** @deprecated Alias für Partner-Importe */
export const partnerDetailStatusPillClass = portalDetailStatusPillClass;
export const partnerDetailStatusPillStyle = portalDetailStatusPillStyle;
