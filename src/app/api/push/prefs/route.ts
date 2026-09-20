import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "DB nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const {data: prefs, error: __dbErr238_1} = await supabaseAdmin
    .from("push_prefs")
    .select("push_enabled")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (__dbErr238_1) logDbError('app/api/push/prefs/route:push_prefs', __dbErr238_1)

  const {count, error: __dbErr239_2} = await supabaseAdmin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", user.id);
  if (__dbErr239_2) logDbError('app/api/push/prefs/route:push_subscriptions', __dbErr239_2)

  return NextResponse.json({
    push_enabled: Boolean(prefs?.push_enabled),
    subscription_count: count ?? 0,
  });
}

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "DB nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await req.json()) as { push_enabled?: boolean };
  if (typeof body.push_enabled !== "boolean") {
    return NextResponse.json({ error: "push_enabled fehlt." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("push_prefs").upsert(
    {
      auth_user_id: user.id,
      push_enabled: body.push_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" }
  );
  if (error) logDbError('app/api/push/prefs/route:push_prefs', error)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!body.push_enabled) {
    const { error: __dbErr240_3 } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id);
    if (__dbErr240_3) logDbError('app/api/push/prefs/route:push_subscriptions', __dbErr240_3)
  }

  return NextResponse.json({ ok: true, push_enabled: body.push_enabled });
}
