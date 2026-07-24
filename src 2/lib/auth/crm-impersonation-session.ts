import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const BW_ADMIN_VIEW_COOKIE = "bw_admin_view";

function supabaseKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceKey) return null;
  return { url, anonKey, serviceKey };
}

function cookieClient() {
  const keys = supabaseKeys();
  if (!keys) return null;
  const cookieStore = cookies();
  return createServerClient(keys.url, keys.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set({ name, value, ...options })
        );
      },
    },
  });
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

export function setAdminViewCookie(payload: {
  roleLabel: string;
  adminEmail: string;
}) {
  cookies().set(
    BW_ADMIN_VIEW_COOKIE,
    JSON.stringify({
      roleLabel: payload.roleLabel,
      adminEmail: payload.adminEmail,
      startedAt: new Date().toISOString(),
    }),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
      path: "/",
    }
  );
}

/** Serverseitig einloggen (ersetzt alte Portal-Session zuverlässig). */
export async function establishPortalSessionForEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const keys = supabaseKeys();
  const supabase = cookieClient();
  if (!keys || !supabase) {
    return { ok: false, error: "Supabase nicht konfiguriert." };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return { ok: false, error: "Ungültige E-Mail." };
  }

  await supabase.auth.signOut();

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

  return { ok: true };
}
