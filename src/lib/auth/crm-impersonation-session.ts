import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  AUTH_SESSION_COOKIE_OPTIONS,
  AUTH_SIGNOUT_OPTS,
  PLATFORM_AUTH_COOKIE_NAME,
  applyAuthSessionCookieOptions,
  matchAuthCookieNames,
  supabaseLegacyAuthCookieBaseName,
} from "@/lib/supabase/auth-session";

export const BW_ADMIN_VIEW_COOKIE = "bw_admin_view";

export type SessionCookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function supabaseKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceKey) return null;
  return { url, anonKey, serviceKey };
}

function cookieClient(collected: SessionCookieToSet[]) {
  const keys = supabaseKeys();
  if (!keys) return null;
  const cookieStore = cookies();
  return createServerClient(keys.url, keys.anonKey, {
    cookieOptions: AUTH_SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        // 3-Argument-Form: Chunk-Namen (name.0 / name.1) nicht überschreiben
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = applyAuthSessionCookieOptions(options);
          cookieStore.set(name, value, opts);
          collected.push({ name, value, options: opts });
        });
      },
    },
  });
}

function clearAuthCookiesByBase(
  baseName: string,
  collected: SessionCookieToSet[]
) {
  const cookieStore = cookies();
  const names = matchAuthCookieNames(
    cookieStore.getAll().map((c) => c.name),
    baseName
  );
  for (const name of names) {
    const opts: CookieOptions = { path: "/", maxAge: 0 };
    cookieStore.set(name, "", opts);
    collected.push({ name, value: "", options: opts });
  }
}

function clearLegacyDefaultAuthCookies(collected: SessionCookieToSet[]) {
  const legacyBase = supabaseLegacyAuthCookieBaseName();
  if (legacyBase) clearAuthCookiesByBase(legacyBase, collected);
}

/** Stale Platform-Chunks vor neuem setSession entfernen (nach signOut). */
function clearPlatformAuthCookies(collected: SessionCookieToSet[]) {
  clearAuthCookiesByBase(PLATFORM_AUTH_COOKIE_NAME, collected);
}

export function clearAdminViewCookie() {
  cookies().set(BW_ADMIN_VIEW_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function adminViewCookiePayload(payload: {
  roleLabel: string;
  adminEmail: string;
}): SessionCookieToSet {
  return {
    name: BW_ADMIN_VIEW_COOKIE,
    value: JSON.stringify({
      roleLabel: payload.roleLabel,
      adminEmail: payload.adminEmail,
      startedAt: new Date().toISOString(),
    }),
    options: {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
      path: "/",
    },
  };
}

export function setAdminViewCookie(payload: {
  roleLabel: string;
  adminEmail: string;
}) {
  const c = adminViewCookiePayload(payload);
  cookies().set(c.name, c.value, c.options);
}

/**
 * Serverseitig einloggen (ersetzt alte Portal-Session zuverlässig).
 * Liefert Cookies zum expliziten Setzen auf NextResponse.redirect —
 * sonst gehen sie beim Redirect oft verloren → Login-Seite.
 */
export async function establishPortalSessionForEmail(
  email: string
): Promise<
  { ok: true; cookies: SessionCookieToSet[] } | { ok: false; error: string }
> {
  const keys = supabaseKeys();
  const collected: SessionCookieToSet[] = [];
  const supabase = cookieClient(collected);
  if (!keys || !supabase) {
    return { ok: false, error: "Supabase nicht konfiguriert." };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return { ok: false, error: "Ungültige E-Mail." };
  }

  // Nur lokale Cookie-Session — global würde CRM-Staff-Tokens killen
  await supabase.auth.signOut(AUTH_SIGNOUT_OPTS);
  clearPlatformAuthCookies(collected);
  clearLegacyDefaultAuthCookies(collected);

  const admin = createClient(keys.url, keys.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });

  const otp = linkData?.properties?.email_otp?.trim();
  if (linkErr || !otp) {
    return {
      ok: false,
      error: linkErr?.message ?? "Magic-Link/OTP konnte nicht erzeugt werden.",
    };
  }

  // Admin-Impersonation: E-Mail als bestätigt (sonst Middleware → Login)
  const userId = linkData?.user?.id;
  if (userId && !linkData.user?.email_confirmed_at) {
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  }

  const anon = createClient(keys.url, keys.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    email: normalized,
    token: otp,
    type: "email",
  });

  if (verifyErr || !verified.session) {
    return {
      ok: false,
      error: verifyErr?.message ?? "OTP-Verifizierung fehlgeschlagen.",
    };
  }

  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });

  if (sessionErr) {
    return { ok: false, error: sessionErr.message };
  }

  clearLegacyDefaultAuthCookies(collected);
  return { ok: true, cookies: collected };
}
