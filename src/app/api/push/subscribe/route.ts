import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { isPushServerConfigured } from "@/lib/push/vapid";

export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !isPushServerConfigured()) {
    return NextResponse.json(
      { error: "Push nicht konfiguriert." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await req.json()) as {
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    portal?: string;
    userAgent?: string;
  };

  const endpoint = body.subscription?.endpoint?.trim() ?? "";
  const p256dh = body.subscription?.keys?.p256dh?.trim() ?? "";
  const auth = body.subscription?.keys?.auth?.trim() ?? "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Ungültige Subscription." }, { status: 400 });
  }

  const portal =
    body.portal === "partner" || body.portal === "portal"
      ? body.portal
      : "portal";

  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      auth_user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: body.userAgent?.slice(0, 400) ?? null,
      portal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("push_prefs").upsert(
    {
      auth_user_id: user.id,
      push_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" }
  );

  return NextResponse.json({ ok: true });
}
