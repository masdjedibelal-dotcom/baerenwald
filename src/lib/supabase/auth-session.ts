import type { CookieOptions, CookieOptionsWithName } from "@supabase/ssr";

/**
 * Eigener Cookie-Name für Portal/Partner — CRM nutzt `sb-bw-crm-auth`.
 * Ohne Prefix teilen sich alle Apps denselben Default
 * `sb-<projekt-ref>-auth-token` (lokal: localhost :3000/:3001).
 */
export const PLATFORM_AUTH_COOKIE_NAME = "sb-bw-platform-auth";

/** Nutzer bleiben standardmäßig 5 Tage eingeloggt (Browser-Cookie). */
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 5;

/** Nur für createBrowserClient / createServerClient — NICHT in cookieStore.set-Options. */
export const AUTH_SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  name: PLATFORM_AUTH_COOKIE_NAME,
  maxAge: AUTH_SESSION_MAX_AGE_SEC,
  sameSite: "lax",
  path: "/",
};

/**
 * Options für cookieStore.set(name, value, options).
 * Wichtig: KEIN `name` hier — @supabase/ssr löscht name bewusst, damit Chunks
 * (`sb-bw-platform-auth.0`, `.1`) den Parameter-Namen behalten.
 * name wieder reinzusetzen überschreibt Chunks → Session kaputt (CRM-Enter → Login).
 */
export function applyAuthSessionCookieOptions(
  options: CookieOptions
): CookieOptions {
  const { name: _ignored, ...rest } = options as CookieOptions & {
    name?: string;
  };
  if (rest.maxAge === 0) {
    return {
      ...rest,
      path: rest.path ?? "/",
    };
  }

  return {
    ...rest,
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    sameSite: rest.sameSite ?? "lax",
    path: rest.path ?? "/",
  };
}

/** Nur lokale Cookie-Session — nie global (sonst CRM-Staff-Session tot). */
export const AUTH_SIGNOUT_OPTS = { scope: "local" as const };

export function supabaseLegacyAuthCookieBaseName(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    if (!ref) return null;
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

export function matchAuthCookieNames(
  allNames: string[],
  baseName: string
): string[] {
  return allNames.filter(
    (n) => n === baseName || n.startsWith(`${baseName}.`)
  );
}
