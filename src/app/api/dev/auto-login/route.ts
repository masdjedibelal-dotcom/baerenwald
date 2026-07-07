import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getDevPortalCredentials,
  isTestAuthBypassEnabled,
  type DevPortalRole,
} from "@/lib/dev-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function signInWithPassword(email: string, password: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  return supabase.auth.signInWithPassword({ email, password });
}

async function resolveEmailForRole(role: DevPortalRole): Promise<string | null> {
  if (role === "org") {
    const forced = process.env.E2E_ORG_EMAIL?.trim();
    if (forced) return forced;

    const { data } = await supabaseAdmin
      .from("kunden")
      .select("email, auth_user_id")
      .eq("portal_modus", "organisation")
      .not("email", "is", null)
      .not("auth_user_id", "is", null)
      .limit(1)
      .maybeSingle();
    return data?.email?.trim() ?? null;
  }

  if (role === "partner") {
    const forced = process.env.E2E_PARTNER_EMAIL?.trim();
    if (forced) return forced;

    const { data } = await supabaseAdmin
      .from("handwerker")
      .select("email, auth_user_id")
      .not("email", "is", null)
      .not("auth_user_id", "is", null)
      .limit(1)
      .maybeSingle();
    return data?.email?.trim() ?? null;
  }

  const forced = process.env.E2E_PRIVAT_EMAIL?.trim();
  if (forced) return forced;

  const { data } = await supabaseAdmin
    .from("kunden")
    .select("email, auth_user_id")
    .eq("portal_modus", "privat")
    .not("email", "is", null)
    .not("auth_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  return data?.email?.trim() ?? null;
}

/** Fallback: Service-Role OTP (ohne Passwort in .env). */
async function signInWithServiceOtp(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey || !serviceKey) {
    return { error: new Error("Supabase-Keys fehlen") };
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/portal`,
    },
  });
  if (linkErr || !linkData?.properties?.email_otp) {
    return { error: linkErr ?? new Error("OTP konnte nicht erzeugt werden") };
  }

  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: "email",
  });
  if (verifyErr || !verified.session) {
    return { error: verifyErr ?? new Error("OTP-Verifizierung fehlgeschlagen") };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
  return { error: sessionErr };
}

export async function GET(request: Request) {
  if (!isTestAuthBypassEnabled()) {
    return NextResponse.json(
      { error: "TEST_AUTH_BYPASS ist nicht aktiv." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const role = (url.searchParams.get("role") ?? "org") as DevPortalRole;
  const forcedEmail = url.searchParams.get("email")?.trim();
  const next = url.searchParams.get("next") ?? (role === "partner" ? "/partner" : "/portal");
  const target = next.startsWith("/") ? next : "/portal";

  let error: { message: string } | null = null;

  if (forcedEmail) {
    const password =
      process.env.E2E_ORG_PASSWORD?.trim() ||
      process.env.E2E_DEFAULT_PASSWORD?.trim() ||
      "E2eTestPass2026!";
    const res = await signInWithPassword(forcedEmail, password);
    error = res.error;
  } else {
    const creds = getDevPortalCredentials(role);
    if (creds) {
      const res = await signInWithPassword(creds.email, creds.password);
      error = res.error;
    } else {
      const email = await resolveEmailForRole(role);
      if (!email) {
        return NextResponse.json(
          { error: `Kein Auth-User für Rolle „${role}" gefunden.` },
          { status: 404 }
        );
      }
      const res = await signInWithServiceOtp(email);
      error = res.error;
    }
  }

  if (error) {
    const login =
      role === "partner"
        ? new URL("/partner/login", request.url)
        : new URL("/portal/login", request.url);
    login.searchParams.set("dev_error", encodeURIComponent(error.message));
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(target, request.url));
}
