/**
 * Portal 2.0 TEIL F — Auth-Copy & Helpers (`authWL`, `authBrandName`, `authConfirm`).
 * Demo-Rollen-Pills aus dem Mock entfallen; Rolle kommt aus Route/Kontext.
 */

export type AuthPortalRole =
  | "mieter"
  | "eigentuemer"
  | "kunde"
  | "handwerker";

export type AuthScreenId =
  | "login"
  | "magic"
  | "magicSent"
  | "forgot"
  | "forgotSent"
  | "invite"
  | "inviteDone";

/** Mock `authWL()` — Mieter/Eigentümer → HV-Whitelabel. */
export function authWL(role: AuthPortalRole): boolean {
  return role === "mieter" || role === "eigentuemer";
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
  magicToggle: "Ohne Passwort per Magic-Link anmelden",
  submit: "Anmelden",
  submitMagic: "Magic-Link senden",
  or: "oder",
  google: "Google",
  microsoft: "Microsoft",
  neu: "Neu hier?",
  zugang: "Zugang anfordern",
} as const;

export const AUTH_MAGIC = {
  title: "Anmeldelink anfordern",
  subtitle: "Wir senden Ihnen einen sicheren Einmal-Link — kein Passwort nötig.",
  submit: "Link senden",
  back: "‹ Zurück zum Login",
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
  nameLabel: "Ihr Name",
  emailLabel: "E-Mail",
  passwordLabel: "Passwort festlegen",
  passwordRepeatLabel: "Passwort wiederholen",
  passwordPh: "Mind. 8 Zeichen",
  submit: "Konto aktivieren",
} as const;

/** Mock `authConfirm` Screens. */
export const AUTH_CONFIRM = {
  magicSent: {
    icon: "✉",
    title: "Link gesendet",
    body: "Wir haben einen Anmeldelink an Ihre E-Mail geschickt. Öffnen Sie ihn auf diesem Gerät, um sich anzumelden. Der Link ist 15 Minuten gültig.",
    action: "Erneut senden",
  },
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
    q === "kunde" ||
    q === "handwerker"
  ) {
    return q;
  }
  if (pathname.startsWith("/partner")) return "handwerker";
  if (pathname.includes("einladung")) return "mieter";
  return "kunde";
}
