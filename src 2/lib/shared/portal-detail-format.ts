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
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (s === "abgelehnt" || s === "storniert" || s === "antwort_abgelaufen") {
    return "tag bg-red-100 text-red-700";
  }
  if (s === "geaendert" || s === "ergaenzung" || s.includes("geändert")) {
    return "tag bg-violet-100 text-violet-800";
  }
  if (s === "neu") {
    return "tag bg-orange-100 text-orange-800";
  }
  if (s === "bautagebuch" || s.includes("tagebuch")) {
    return "tag bg-amber-100 text-amber-900";
  }
  if (s === "in_arbeit" || s === "abnahme" || s === "termin" || s.includes("arbeit") || s.includes("aktiv")) {
    return "tag bg-blue-100 text-blue-800";
  }
  if (s.includes("angebot") || s.includes("gesendet") || s.includes("entwurf")) {
    return "tag bg-amber-100 text-amber-800";
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
    return { color: "#4B5563", backgroundColor: "#EAEDEC" };
  }
  if (s === "abgelehnt" || s === "storniert" || s === "antwort_abgelaufen") {
    return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  }
  if (s === "geaendert" || s === "ergaenzung" || s.includes("geändert")) {
    return { color: "#6d28d9", backgroundColor: "#ede9fe" };
  }
  if (s === "neu" || s === "aktion") {
    return { color: "#1F4FA8", backgroundColor: "#E4ECF7" };
  }
  if (s === "bautagebuch" || s.includes("tagebuch")) {
    return { color: "#8A5A06", backgroundColor: "#FBF1D6" };
  }
  if (
    s === "in_arbeit" ||
    s === "abnahme" ||
    s === "termin" ||
    s === "durchfuehrung" ||
    s.includes("arbeit") ||
    s.includes("aktiv")
  ) {
    return { color: "#1F6A3F", backgroundColor: "#DDEEDF" };
  }
  if (s.includes("angebot") || s.includes("gesendet") || s.includes("entwurf")) {
    return { color: "#8A5A06", backgroundColor: "#FBF1D6" };
  }
  return { color: "#4B5563", backgroundColor: "#EAEDEC" };
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
