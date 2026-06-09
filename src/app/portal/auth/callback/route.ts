import { NextResponse } from "next/server";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const meta = user.user_metadata as {
          name?: string;
          telefon?: string;
        };
        await linkPortalKundeToAuthUser({
          userId: user.id,
          email: user.email,
          name: meta?.name ?? user.email.split("@")[0],
          telefon: meta?.telefon,
        });
      }
      const safeNext = next.startsWith("/portal") ? next : "/portal";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.error("[portal/auth/callback]", error.message);
  }

  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  const query = authError
    ? `?error=auth&msg=${encodeURIComponent(authError.slice(0, 120))}`
    : "?error=auth";
  return NextResponse.redirect(`${origin}/portal/login${query}`);
}
