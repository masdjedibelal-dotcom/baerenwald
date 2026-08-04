import { NextResponse } from "next/server";

import { uploadMeldungMedia } from "@/lib/org/meldung-storage";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Storage nicht verfügbar." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 12, 60 * 60 * 1000, "meldung_upload");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Zu viele Uploads." }, { status: 429 });
  }

  const form = await req.formData();
  const sessionKey = String(form.get("session_key") ?? "temp").trim();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei." }, { status: 400 });
  }

  const uploaded = await uploadMeldungMedia(sessionKey, file);
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 400 });
  }

  return NextResponse.json({ url: uploaded.publicUrl, typ: uploaded.typ });
}
