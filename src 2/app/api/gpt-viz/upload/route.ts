import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
import { uploadGptVizImage } from "@/lib/gpt-viz/storage";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Storage nicht konfiguriert." }, { status: 503 });
  }

  const form = await req.formData();
  const sessionId = String(form.get("session_id") ?? "").trim();
  const kind = String(form.get("kind") ?? "raum").trim();
  const file = form.get("file");

  if (!sessionId) {
    return Response.json({ error: "session_id fehlt." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  const subfolder = kind === "inspiration" ? "inspiration" : "raum";
  const uploaded = await uploadGptVizImage(sessionId, file, subfolder);
  if (!uploaded.ok) {
    return Response.json({ error: uploaded.error }, { status: 400 });
  }

  if (kind === "inspiration") {
    const updated = await updateGptVizSession(sessionId, {
      ziel_bild_url: uploaded.publicUrl,
    });
    if (!updated) {
      return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
    }
    return Response.json({
      url: uploaded.publicUrl,
      ziel_bild_url: updated.ziel_bild_url,
    });
  }

  const urls = [...session.ist_bilder_urls, uploaded.publicUrl];
  const updated = await updateGptVizSession(sessionId, { ist_bilder_urls: urls });
  if (!updated) {
    return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
  }

  return Response.json({
    url: uploaded.publicUrl,
    ist_bilder_urls: updated.ist_bilder_urls,
  });
}
