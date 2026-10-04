/**
 * Portal 2.0 TEIL F — Auth-Copy & Helpers (`authWL`, `authBrandName`, `authConfirm`).
 * Demo-Rollen-Pills aus dem Mock entfallen; Rolle kommt aus Route/Kontext.
 */

/** Mieter, Eigentümer und Hausmeister haben kein Portal mehr (04.10.2026). */
export type AuthPortalRole = "kunde" | "handwerker";

/** Whitelabel gab es nur für Mieter/Eigentümer/Hausmeister — entfällt. */
export function authWL(role: AuthPortalRole): boolean {
  void role;
  return false;
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

export function authBrandCopy(role: AuthPortalRole): {
  tagline: string;
  body: string;
  bullets: readonly (readonly [string, string])[];
} {
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
export const AUTH_ADMIN_VIEW_PREFIX = "Admin-Ansicht: Sie sehen das Portal als";
export const AUTH_ADMIN_VIEW_END = "Beenden";

export function resolveAuthRoleFromPath(
  pathname: string,
  searchRole?: string | null
): AuthPortalRole {
  const q = (searchRole ?? "").trim().toLowerCase();
  if (q === "kunde" || q === "handwerker") return q;
  if (pathname.startsWith("/partner")) return "handwerker";
  return "kunde";
}
