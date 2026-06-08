import { randomUUID } from "crypto";

import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type ClaudeMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export function isPublicUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function resolveUploadMime(file: File): string | null {
  const fromType = file.type?.split(";")[0]?.trim().toLowerCase();
  if (fromType === "image/heic" || fromType === "image/heif") return null;
  if (fromType && ALLOWED_MIME.has(fromType)) return fromType;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return null;
  return null;
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

function normalizeMediaType(contentType: string): ClaudeMediaType {
  const t = contentType.split(";")[0]?.trim().toLowerCase();
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  if (t === "image/gif") return "image/gif";
  return "image/jpeg";
}

export async function loadImageBase64ForClaude(
  stored: string
): Promise<{ mediaType: ClaudeMediaType; data: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Storage nicht konfiguriert.");
  }

  const v = stored.trim();
  let buffer: Buffer;
  let contentType = "image/jpeg";

  const pathFromUrl = isPublicUrl(v) ? extractStoragePath(v, GPT_VIZ_STORAGE_BUCKET) : null;
  if (pathFromUrl) {
    const { data, error } = await supabaseAdmin.storage
      .from(GPT_VIZ_STORAGE_BUCKET)
      .download(pathFromUrl);
    if (error || !data) {
      throw new Error("Bild konnte nicht aus dem Storage geladen werden.");
    }
    buffer = Buffer.from(await data.arrayBuffer());
    contentType = data.type || contentType;
  } else if (isPublicUrl(v)) {
    const res = await fetch(v, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Bild-URL ist nicht öffentlich erreichbar.");
    }
    buffer = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") || contentType;
  } else {
    const { data, error } = await supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).download(v);
    if (error || !data) {
      throw new Error("Bild konnte nicht aus dem Storage geladen werden.");
    }
    buffer = Buffer.from(await data.arrayBuffer());
    contentType = data.type || contentType;
  }

  return {
    mediaType: normalizeMediaType(contentType),
    data: buffer.toString("base64"),
  };
}

export async function uploadGptVizImage(
  sessionId: string,
  file: File,
  subfolder: "raum" | "inspiration" = "raum"
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const contentType = resolveUploadMime(file);
  if (!contentType) {
    return {
      ok: false,
      error: "Bitte JPEG, PNG oder WebP (iPhone: HEIC in den Einstellungen deaktivieren).",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Bild ist zu groß (max. 12 MB)." };
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `sessions/${sessionId}/${subfolder}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .upload(path, buf, { contentType, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data } = supabaseAdmin.storage.from(GPT_VIZ_STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
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
