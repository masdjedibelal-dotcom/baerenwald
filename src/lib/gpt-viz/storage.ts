import { randomUUID } from "crypto";

import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function isPublicUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export async function uploadGptVizImage(
  sessionId: string,
  file: File
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Bitte ein Bild (JPG/PNG/WebP) hochladen." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Bild ist zu groß (max. 12 MB)." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `sessions/${sessionId}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data } = supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  return { ok: true, path, publicUrl };
}

export async function uploadGptVizFromUrl(
  sessionId: string,
  imageUrl: string
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return { ok: false, error: "Render-Bild konnte nicht gespeichert werden." };
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `sessions/${sessionId}/render-${randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(GPT_VIZ_STORAGE_BUCKET)
      .upload(path, buf, { contentType, upsert: false });
    if (error) return { ok: false, error: error.message };
    const { data } = supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).getPublicUrl(path);
    return { ok: true, path, publicUrl: data.publicUrl };
  } catch {
    return { ok: false, error: "Render-Bild konnte nicht gespeichert werden." };
  }
}

export function resolvePublicImageUrl(stored: string): string {
  const v = stored.trim();
  if (isPublicUrl(v)) return v;
  const { data } = supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).getPublicUrl(v);
  return data.publicUrl;
}
