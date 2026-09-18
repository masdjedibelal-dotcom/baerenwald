/**
 * Portal 2.0 TEIL F — Auth-Copy & Helpers (`authWL`, `authBrandName`, `authConfirm`).
 * Demo-Rollen-Pills aus dem Mock entfallen; Rolle kommt aus Route/Kontext.
 */

export type AuthPortalRole =
  | "mieter"
  | "eigentuemer"
  | "hausmeister"
  | "kunde"
  | "handwerker";

export type AuthScreenId =
  | "login"
  | "forgot"
  | "forgotSent"
  | "invite"
  | "inviteDone";

/** Mock `authWL()` — Mieter/Eigentümer/Hausmeister → HV-Whitelabel. */
export function authWL(role: AuthPortalRole): boolean {
  return (
    role === "mieter" || role === "eigentuemer" || role === "hausmeister"
  );
}

/** Mock `authBrandName()` */
export function authBrandName(
  role: AuthPortalRole,
  orgName?: string | null
): string {
  if (authWL(role)) {
    return orgName?.trim() || "Verwaltung";
  }
  return "Bärenwald";
}

export const AUTH_BRAND_BULLETS = [
  ["✓", "Ende-zu-Ende verschlüsselt"],
  ["✓", "Kein Papier, keine E-Mail-Ketten"],
  ["✓", "DSGVO-konform, Server in DE"],
] as const;

export const AUTH_BRAND_TAGLINE_WL = "Ihr Portal für alle Anliegen.";
export const AUTH_BRAND_TAGLINE_BW = "Ihr Portal für alle Vorgänge.";

export const AUTH_BRAND_BODY_WL =
  "Schäden melden, Termine bestätigen und den Fortschritt Ihrer Anliegen in Echtzeit verfolgen — an einem Ort.";

export const AUTH_BRAND_BODY_BW =
  "Anfragen melden, Angebote freigeben, Termine bestätigen und den Fortschritt in Echtzeit verfolgen — an einem Ort.";

/** Vorteile — Mieter (Einladung / WL-Login). */
export const AUTH_BRAND_TAGLINE_MIETER =
  "Ihr Portal für Wohnung und Anliegen.";
export const AUTH_BRAND_BODY_MIETER =
  "Schäden melden, den Bearbeitungsstand verfolgen und Infos Ihrer Verwaltung einsehen — klar und ohne Umwege.";
export const AUTH_BRAND_BULLETS_MIETER = [
  ["✓", "Schäden direkt melden und Status sehen"],
  ["✓", "Termine und Infos der Verwaltung"],
  ["✓", "DSGVO-konform, Server in DE"],
] as const;

/** Vorteile — Eigentümer (Einladung / WL-Login). */
export const AUTH_BRAND_TAGLINE_EIGENTUEMER =
  "Ihr Portal für Objekt und Vorgänge.";
export const AUTH_BRAND_BODY_EIGENTUEMER =
  "Vorgänge und Freigaben im Blick behalten, den Stand der Bearbeitung sehen und entscheiden, wo Ihre Zustimmung nötig ist.";
export const AUTH_BRAND_BULLETS_EIGENTUEMER = [
  ["✓", "Vorgänge transparent nachverfolgen"],
  ["✓", "Freigaben und Status an einem Ort"],
  ["✓", "DSGVO-konform, Server in DE"],
] as const;

/** Vorteile — Hausmeister. */
export const AUTH_BRAND_TAGLINE_HAUSMEISTER =
  "Ihr Portal für Prüfungen vor Ort.";
export const AUTH_BRAND_BODY_HAUSMEISTER =
  "Vorgänge Ihrer Objekte einsehen und Hausmeister-Prüfungen mit Checkliste durchführen — klar und mobil.";
export const AUTH_BRAND_BULLETS_HAUSMEISTER = [
  ["✓", "Checklisten für Ihre Objekte"],
  ["✓", "Alle Vorgänge der zugewiesenen Gebäude"],
  ["✓", "DSGVO-konform, Server in DE"],
] as const;

export function authBrandCopy(role: AuthPortalRole): {
  tagline: string;
  body: string;
  bullets: readonly (readonly [string, string])[];
} {
  if (role === "mieter") {
    return {
      tagline: AUTH_BRAND_TAGLINE_MIETER,
      body: AUTH_BRAND_BODY_MIETER,
      bullets: AUTH_BRAND_BULLETS_MIETER,
    };
  }
  if (role === "eigentuemer") {
    return {
      tagline: AUTH_BRAND_TAGLINE_EIGENTUEMER,
      body: AUTH_BRAND_BODY_EIGENTUEMER,
      bullets: AUTH_BRAND_BULLETS_EIGENTUEMER,
    };
  }
  if (role === "hausmeister") {
    return {
      tagline: AUTH_BRAND_TAGLINE_HAUSMEISTER,
      body: AUTH_BRAND_BODY_HAUSMEISTER,
      bullets: AUTH_BRAND_BULLETS_HAUSMEISTER,
    };
  }
  if (authWL(role)) {
    return {
      tagline: AUTH_BRAND_TAGLINE_WL,
      body: AUTH_BRAND_BODY_WL,
      bullets: AUTH_BRAND_BULLETS,
    };
  }
  return {
    tagline: AUTH_BRAND_TAGLINE_BW,
    body: AUTH_BRAND_BODY_BW,
    bullets: AUTH_BRAND_BULLETS,
  };
}

export const AUTH_BRAND_POWERED = "Betrieben mit Bärenwald";

export const AUTH_LOGIN = {
  title: "Willkommen zurück",
  subtitle: (brand: string) =>
    `Melden Sie sich bei Ihrem Portal von ${brand} an.`,
  emailLabel: "E-Mail",
  emailPh: "name@firma.de",
  passwordLabel: "Passwort",
  passwordPh: "••••••••",
  forgot: "Vergessen?",
  submit: "Anmelden",
  or: "oder",
  google: "Google",
  microsoft: "Microsoft",
  neu: "Neu hier?",
  zugang: "Registrieren",
} as const;

export const AUTH_FORGOT = {
  title: "Passwort zurücksetzen",
  subtitle:
    "Geben Sie Ihre E-Mail ein — wir senden Ihnen einen Link zum Neusetzen.",
  submit: "Link senden",
  back: "‹ Zurück zum Login",
} as const;

export const AUTH_INVITE = {
  eyebrow: "Einladung von",
  title: "Konto aktivieren",
  subtitle:
    "Sie wurden eingeladen. Vergeben Sie ein Passwort, um Ihr Portal zu aktivieren.",
  subtitleMieter:
    "Ihre Verwaltung hat Sie eingeladen. Angaben sind vorausgefüllt — bitte Passwort setzen und zustimmen.",
  subtitleEigentuemer:
    "Ihre Verwaltung hat Sie als Eigentümer eingeladen. Angaben sind vorausgefüllt — bitte Passwort setzen und zustimmen.",
  subtitleHausmeister:
    "Ihre Verwaltung hat Sie als Hausmeister eingeladen. Angaben sind vorausgefüllt — bitte nur noch ein Passwort setzen.",
  nameLabel: "Ihr Name",
  emailLabel: "E-Mail",
  passwordLabel: "Passwort festlegen",
  passwordRepeatLabel: "Passwort wiederholen",
  passwordPh: "Mind. 8 Zeichen",
  submit: "Konto aktivieren",
  lockedHint:
    "Ihre Angaben von der Verwaltung sind übernommen. Bitte nur noch ein Passwort vergeben und die Zustimmung erteilen.",
  lockedHintHausmeister:
    "Ihre Angaben von der Verwaltung sind übernommen. Bitte nur noch ein Passwort vergeben.",
} as const;

/** Mock `authConfirm` Screens. */
export const AUTH_CONFIRM = {
  forgotSent: {
    icon: "✓",
    title: "E-Mail unterwegs",
    body: "Falls ein Konto mit dieser Adresse existiert, erhalten Sie in Kürze einen Link zum Zurücksetzen Ihres Passworts.",
    action: "Erneut senden",
  },
  inviteDone: {
    icon: "✓",
    title: "Konto aktiv",
    body: (brand: string) =>
      `Ihr Zugang zum Portal von ${brand} ist eingerichtet. Sie können sich jetzt anmelden.`,
    action: "Zum Login",
  },
} as const;

/** Impersonation-Delta (nicht im Mock) — Banner-Wortlaut. */
export const AUTH_ADMIN_VIEW_PREFIX = "Admin-Ansicht: Du siehst das Portal als";
export const AUTH_ADMIN_VIEW_END = "Beenden";

export function resolveAuthRoleFromPath(
  pathname: string,
  searchRole?: string | null
): AuthPortalRole {
  const q = (searchRole ?? "").trim().toLowerCase();
  if (
    q === "mieter" ||
    q === "eigentuemer" ||
    q === "hausmeister" ||
    q === "kunde" ||
    q === "handwerker"
  ) {
    return q;
  }
  if (pathname.startsWith("/partner")) return "handwerker";
  if (pathname.includes("einladung")) return "mieter";
  return "kunde";
}
