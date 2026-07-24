/**
 * Portal 2.0 Fehler-/Leer-Zustände — Mock `screenState` Texte 1:1
 * Quelle: Baerenwald Portale (5).html
 */

export type PortalStateKind =
  | "leer"
  | "e404"
  | "zugriff"
  | "server"
  | "offline";

export type PortalStateRole =
  | "kunde"
  | "handwerker"
  | "eigentuemer"
  | "mieter"
  | "hv";

export type PortalStateCopy = {
  kind: PortalStateKind;
  /** Mock-Glyph für Icon-Bubble */
  glyph: string;
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
  primaryLabel: string | null;
  secondaryLabel: string | null;
};

const BTN = {
  retry: "Erneut versuchen",
  overview: "Zur Übersicht",
  support: "Support kontaktieren",
} as const;

export function portalEmptySubtitle(role: PortalStateRole = "kunde"): string {
  if (role === "handwerker") {
    return "Sobald Ihnen ein Auftrag zugewiesen wird, erscheint er hier. Tipp: Prüfen Sie auch den Filter „Offen“.";
  }
  if (role === "eigentuemer" || role === "mieter") {
    return "Für Ihre Wohnung liegt aktuell keine Meldung vor. Bei Schäden nutzen Sie den Melde-Link Ihrer Verwaltung.";
  }
  if (role === "hv") {
    return "Hier erscheinen Meldungen und Vorgänge Ihrer Objekte. Legen Sie den ersten Vorgang an oder warten Sie auf Mieter-Meldungen.";
  }
  return "Hier erscheinen Ihre Anfragen und Aufträge. Legen Sie den ersten Vorgang an.";
}

/** Leer-Titel laut Mock (auch Eigentümer/Mieter nutzen denselben Titel). */
export const PORTAL_EMPTY_TITLE = "Noch keine Vorgänge";

export function resolvePortalStateCopy(
  kind: PortalStateKind,
  opts?: {
    role?: PortalStateRole;
    /** Mock: `+ ${createLabel()}` wenn canCreate */
    createLabel?: string | null;
    canCreate?: boolean;
  }
): PortalStateCopy {
  const role = opts?.role ?? "kunde";

  switch (kind) {
    case "leer": {
      const canCreate = Boolean(opts?.canCreate && opts.createLabel);
      return {
        kind,
        glyph: "▤",
        iconBg: "var(--p2-primary-soft, #E7F1E9)",
        iconFg: "var(--org-primary, var(--p2-primary, #2E7D52))",
        title: PORTAL_EMPTY_TITLE,
        subtitle: portalEmptySubtitle(role),
        primaryLabel: canCreate ? `+ ${opts!.createLabel}` : null,
        secondaryLabel: null,
      };
    }
    case "e404":
      return {
        kind,
        glyph: "🔍",
        iconBg: "#eef0f2",
        iconFg: "var(--p2-faint, #6A746F)",
        title: "Seite nicht gefunden",
        subtitle:
          "Der aufgerufene Vorgang existiert nicht mehr oder wurde verschoben.",
        primaryLabel: BTN.overview,
        secondaryLabel: null,
      };
    case "zugriff":
      return {
        kind,
        glyph: "🔒",
        iconBg: "#FBF1D6",
        iconFg: "#8A5A06",
        title: "Kein Zugriff",
        subtitle:
          "Für diesen Bereich fehlt Ihnen die Berechtigung. Wenden Sie sich an Ihre Verwaltung oder Bärenwald.",
        primaryLabel: BTN.overview,
        secondaryLabel: BTN.support,
      };
    case "server":
      return {
        kind,
        glyph: "⚠",
        iconBg: "var(--p2-danger-soft, #FCE3E3)",
        iconFg: "var(--p2-danger, #A1242A)",
        title: "Etwas ist schiefgelaufen",
        subtitle:
          "Wir konnten die Daten nicht laden. Bitte versuchen Sie es in einem Moment erneut.",
        primaryLabel: BTN.retry,
        secondaryLabel: BTN.support,
      };
    case "offline":
      return {
        kind,
        glyph: "📡",
        iconBg: "#eef0f2",
        iconFg: "var(--p2-faint, #6A746F)",
        title: "Keine Verbindung",
        subtitle:
          "Sie sind offline. Prüfen Sie Ihre Internetverbindung — Ihre Eingaben bleiben gespeichert.",
        primaryLabel: BTN.retry,
        secondaryLabel: null,
      };
  }
}

/** Kurztitel aus Spec (ohne lange Subtitle) — für Docs/Tests. */
export const PORTAL_STATE_SPEC_STRINGS = [
  "Etwas ist schiefgelaufen",
  "Erneut versuchen",
  "Keine Verbindung",
  "Kein Zugriff",
  "Seite nicht gefunden",
  "Zur Übersicht",
  "Noch keine Vorgänge",
  "Für Ihre Wohnung liegt aktuell keine Meldung vor.",
  "Support kontaktieren",
] as const;

export const PORTAL_SUPPORT_HREF = "/kontakt";
export const PORTAL_OVERVIEW_HREF = "/portal";
