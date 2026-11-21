import { NextResponse } from "next/server";

import { clearAdminViewCookie } from "@/lib/auth/crm-impersonation-session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  clearAdminViewCookie();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const url = new URL(request.url);
  const { searchParams } = url;
  // Auf Netlify zeigt request.url auf die Einzeladresse des Deploys — zurück auf die Adresse, die der Browser aufgerufen hat
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : url.origin;
  const next = searchParams.get("next");
  const hint = searchParams.get("hint") ?? "signed_out";
  const target =
    next && next.startsWith("/partner")
      ? `${origin}${next}${next.includes("?") ? "&" : "?"}hint=${hint}`
      : `${origin}/partner/login?hint=${hint}`;
  return NextResponse.redirect(target, { status: 303 });
}
