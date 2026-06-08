import { createGptVizSession } from "@/lib/gpt-viz/session";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Datenbank nicht konfiguriert." }, { status: 503 });
  }
  const session = await createGptVizSession();
  if (!session) {
    return Response.json({ error: "Session konnte nicht angelegt werden." }, { status: 500 });
  }
  return Response.json({ session_id: session.id, expires_at: session.expires_at });
}
