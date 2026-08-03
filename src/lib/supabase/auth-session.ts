import type { CookieOptions } from "@supabase/ssr";

/**
 * Eigener Cookie-Name für Portal/Partner — CRM nutzt `sb-bw-crm-auth`.
 * Ohne Prefix teilen sich alle Apps denselben Default
 * `sb-<projekt-ref>-auth-token` (lokal: localhost :3000/:3001).
 * Portal-Login überschreibt dann die CRM-Session bzw. signOut(global)
 * invalidiert alle Refresh-Tokens des Users.
 */
export const PLATFORM_AUTH_COOKIE_NAME = "sb-bw-platform-auth";

/** Nutzer bleiben standardmäßig 5 Tage eingeloggt (Browser-Cookie). */
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 5;

export const AUTH_SESSION_COOKIE_OPTIONS: CookieOptions = {
  name: PLATFORM_AUTH_COOKIE_NAME,
  maxAge: AUTH_SESSION_MAX_AGE_SEC,
  sameSite: "lax",
  path: "/",
};

/** Beim Logout maxAge 0 beibehalten, sonst Session-Dauer erzwingen. */
export function applyAuthSessionCookieOptions(
  options: CookieOptions
): CookieOptions {
  if (options.maxAge === 0) {
    return {
      ...options,
      name: options.name ?? PLATFORM_AUTH_COOKIE_NAME,
      path: options.path ?? "/",
    };
  }

  return {
    ...options,
    name: options.name ?? PLATFORM_AUTH_COOKIE_NAME,
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
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
