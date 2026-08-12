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
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id)
      .eq("endpoint", endpoint);
  } else {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
