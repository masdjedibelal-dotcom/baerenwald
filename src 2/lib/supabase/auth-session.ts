import type { CookieOptions } from "@supabase/ssr";

/** Nutzer bleiben standardmäßig 5 Tage eingeloggt (Browser-Cookie). */
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 5;

export const AUTH_SESSION_COOKIE_OPTIONS: CookieOptions = {
  maxAge: AUTH_SESSION_MAX_AGE_SEC,
  sameSite: "lax",
  path: "/",
};

/** Beim Logout maxAge 0 beibehalten, sonst Session-Dauer erzwingen. */
export function applyAuthSessionCookieOptions(
  options: CookieOptions
): CookieOptions {
  if (options.maxAge === 0) {
    return options;
  }

  return {
    ...options,
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
  };
}
