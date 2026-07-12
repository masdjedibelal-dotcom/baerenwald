import { NextResponse } from "next/server";

import { clearAdminViewCookie } from "@/lib/auth/crm-impersonation-session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  clearAdminViewCookie();
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  const hint = searchParams.get("hint") ?? "signed_out";
  const target =
    next && next.startsWith("/partner")
      ? `${origin}${next}${next.includes("?") ? "&" : "?"}hint=${hint}`
      : `${origin}/partner/login?hint=${hint}`;
  return NextResponse.redirect(target, { status: 303 });
}
