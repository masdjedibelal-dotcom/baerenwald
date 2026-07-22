/**
 * Portal 2.0 B4 — notifData Typen, Farben, Templates.
 * Quelle: Baerenwald Portale (5).html `notifData()`
 */

export type PortalNotifRole =
  | "kunde"
  | "eigentuemer"
  | "mieter"
  | "handwerker";

/** Mock-Ereignistypen aus notifData. */
export type PortalNotifTyp =
  | "angebot"
  | "termin"
  | "status"
  | "freigabe"
  | "info"
  | "auftrag";

export type PortalNotifVisual = {
  typ: PortalNotifTyp;
  /** Default-Titel laut Mock */
  title: string;
  iconBg: string;
  iconFg: string;
  glyph: string;
};

/**
 * Visuelle Defaults pro Typ (Statusfarben aus Mock-Bubbles).
 * Partner-Legacy-Typen werden auf diese gemappt.
 */
export const PORTAL_NOTIF_VISUAL: Record<PortalNotifTyp, PortalNotifVisual> = {
  angebot: {
    typ: "angebot",
    title: "Angebot freigabebereit",
    iconBg: "#E4ECF7",
    iconFg: "#1F4FA8",
    glyph: "📄",
  },
  termin: {
    typ: "termin",
    title: "Termin bestätigt",
    iconBg: "#E7F1E9",
    iconFg: "#2E7D52",
    glyph: "📅",
  },
  status: {
    typ: "status",
    title: "Vorgang abgeschlossen",
    iconBg: "#EEF0F2",
    iconFg: "#5B6470",
    glyph: "✓",
  },
  freigabe: {
    typ: "freigabe",
    title: "Kostenfreigabe nötig",
    iconBg: "#FBF1D6",
    iconFg: "#8A5A06",
    glyph: "€",
  },
  info: {
    typ: "info",
    title: "Feedback erwünscht",
    iconBg: "#EEF0F2",
    iconFg: "#5B6470",
    glyph: "★",
  },
  auftrag: {
    typ: "auftrag",
    title: "Neuer Auftrag",
    iconBg: "#E4ECF7",
    iconFg: "#1F4FA8",
    glyph: "🔧",
  },
};

/** Rollen-Titel-Overrides (Mock). */
export const PORTAL_NOTIF_ROLE_TITLES: Partial<
  Record<PortalNotifRole, Partial<Record<PortalNotifTyp, string>>>
> = {
  eigentuemer: {
    status: "Angebot angenommen",
  },
  mieter: {
    termin: "Termin steht fest",
    status: "Meldung in Bearbeitung",
  },
  handwerker: {
    termin: "Termin morgen",
    status: "Freigabe erteilt",
  },
};

/** Rollen-Glyph-Overrides (Mock notifData). */
export const PORTAL_NOTIF_ROLE_GLYPHS: Partial<
  Record<PortalNotifRole, Partial<Record<PortalNotifTyp, string>>>
> = {
  mieter: {
    status: "🔧",
  },
};

/**
 * Template-Vorlagen (Spec) — Platzhalter in `{…}`.
 * Beispiele aus Mock als Beleg.
 */
export const PORTAL_NOTIF_TEMPLATES = {
  kunde: {
    angebot: 'Angebot {nr} „{titel}" wartet auf Ihre Freigabe.',
    termin: "{Betrieb} kommt am {Datum} zwischen {Zeitfenster}.",
    status: '{vg} „{titel}" wurde als erledigt markiert.',
  },
  eigentuemer: {
    freigabe: "{vg} überschreitet Ihren Schwellenwert ({betrag}).",
    status: "Ihre Verwaltung hat {nr} freigegeben.",
  },
  mieter: {
    termin:
      "Der Handwerker kommt am {Datum}, {Zeitfenster}. Bitte Zugang ermöglichen.",
    status: 'Ihre Meldung „{titel}" wird bearbeitet.',
    info: "Ihr Vorgang ist abgeschlossen — wie zufrieden waren Sie?",
  },
  handwerker: {
    auftrag: '{vg} „{titel}" wurde Ihnen zugewiesen.',
    termin: "{Adresse} — {Datum}, {Zeitfenster}.",
    status: "Ihr Angebot für {vg} wurde freigegeben.",
  },
} as const;

export type PortalNotifTemplateVars = Record<string, string | number | undefined | null>;

export function formatPortalNotifTemplate(
  template: string,
  vars: PortalNotifTemplateVars
): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null || v === "" ? `{${key}}` : String(v);
  });
}

/** Partner-Legacy-Typ → Mock-Typ. */
export function mapPartnerTypToPortalNotifTyp(
  typ: string
): PortalNotifTyp {
  if (typ === "neu") return "auftrag";
  if (typ === "bautagebuch") return "info";
  if (typ === "erinnerung" || typ === "geaendert") return "status";
  if (typ === "entfernt") return "status";
  if (typ === "auftrag" || typ === "termin" || typ === "angebot" || typ === "freigabe" || typ === "info" || typ === "status") {
    return typ;
  }
  return "status";
}

/** HV/CRM-Typ-Strings heuristisch mappen. */
export function mapHvTypToPortalNotifTyp(typ: string): PortalNotifTyp {
  const t = typ.toLowerCase();
  if (t.includes("angebot")) return "angebot";
  if (t.includes("freigabe") || t.includes("schwellen")) return "freigabe";
  if (t.includes("termin")) return "termin";
  if (t.includes("auftrag") || t.includes("zuweis")) return "auftrag";
  if (t.includes("feedback") || t.includes("info") || t.includes("tagebuch")) return "info";
  return "status";
}

export function resolvePortalNotifVisual(
  typ: PortalNotifTyp,
  role?: PortalNotifRole
): PortalNotifVisual {
  const base = PORTAL_NOTIF_VISUAL[typ];
  const titleOverride = role ? PORTAL_NOTIF_ROLE_TITLES[role]?.[typ] : undefined;
  const glyphOverride = role ? PORTAL_NOTIF_ROLE_GLYPHS[role]?.[typ] : undefined;
  if (!titleOverride && !glyphOverride) return base;
  return {
    ...base,
    ...(titleOverride ? { title: titleOverride } : {}),
    ...(glyphOverride ? { glyph: glyphOverride } : {}),
  };
}

/** Relative Zeit wie Mock („vor 12 Min“, „Gestern“) — grob de-DE. */
export function formatPortalNotifTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Gerade eben";
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export type PortalNotifItem = {
  id: string;
  typ: PortalNotifTyp;
  titel: string;
  text: string;
  timeLabel: string;
  unread: boolean;
  iconBg: string;
  iconFg: string;
  glyph: string;
  link?: string | null;
  vorgangRef?: string | null;
  createdAt: string;
};
