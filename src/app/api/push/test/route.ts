import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { PUSH_COPY } from "@/lib/push/types";
import { sendWebPushToUsers } from "@/lib/push/send-web-push";
import { isPushServerConfigured } from "@/lib/push/vapid";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST() {
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

  const result = await sendWebPushToUsers([user.id], {
    title: PUSH_COPY.test.title,
    body: PUSH_COPY.test.body,
    url: "/portal",
    tag: "baerenwald-test",
  });

  if (result.sent === 0) {
    return NextResponse.json(
      {
        error:
          "Keine aktive Subscription. Bitte Push in den Einstellungen aktivieren.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, sent: result.sent });
}
