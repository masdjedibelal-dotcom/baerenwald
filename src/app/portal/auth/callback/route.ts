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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/portal/login?error=auth`);
}
