import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (next.startsWith("/portal") || next.startsWith("/partner")) return next;
  return fallback;
}

function loginPathForNext(next: string): string {
  return next.startsWith("/partner") ? "/partner/login" : "/portal/login";
}

/** PKCE-Code eintauschen und zur Zielseite weiterleiten (Passwort-Reset, Bestätigung). */
export async function handleAuthCallbackRequest(
  request: Request,
  fallbackNext: string
): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), fallbackNext);
  const loginPath = loginPathForNext(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback]", error.message);
  }

  const authError =
    searchParams.get("error_description") ?? searchParams.get("error");
  const query = authError
    ? `?error=auth&msg=${encodeURIComponent(authError.slice(0, 120))}`
    : "?error=auth";
  return NextResponse.redirect(`${origin}${loginPath}${query}`);
}
