import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
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

  let endpoint: string | null = null;
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = body.endpoint?.trim() || null;
  } catch {
    endpoint = null;
  }

  if (endpoint) {
    const { error: __dbErr242_1 } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id)
      .eq("endpoint", endpoint);
    if (__dbErr242_1) logDbError('app/api/push/unsubscribe/route:push_subscriptions', __dbErr242_1)
  } else {
    const { error: __dbErr243_2 } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id);
    if (__dbErr243_2) logDbError('app/api/push/unsubscribe/route:push_subscriptions', __dbErr243_2)
  }

  return NextResponse.json({ ok: true });
}
