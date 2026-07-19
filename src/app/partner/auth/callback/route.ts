import { NextResponse } from "next/server";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/partner";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        await linkPortalHandwerkerToAuthUser({
          userId: user.id,
          email: user.email,
        });
      }
      const safeNext = next.startsWith("/partner") ? next : "/partner";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.error("[partner/auth/callback]", error.message);
  }

  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  const query = authError
    ? `?error=auth&msg=${encodeURIComponent(authError.slice(0, 120))}`
    : "?error=auth";
  return NextResponse.redirect(`${origin}/partner/login${query}`);
}
