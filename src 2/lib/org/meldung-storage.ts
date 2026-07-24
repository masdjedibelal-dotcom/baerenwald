import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function uploadMeldungFoto(
  leadId: string,
  file: File
): Promise<{ ok: true; publicUrl: string; typ: "foto" | "video" } | { ok: false; error: string }> {
  return uploadMeldungMedia(leadId, file);
}

export async function uploadMeldungMedia(
  leadId: string,
  file: File
): Promise<{ ok: true; publicUrl: string; typ: "foto" | "video" } | { ok: false; error: string }> {
  const isVideo = VIDEO_TYPES.has(file.type) || file.type.startsWith("video/");
  const isPhoto = PHOTO_TYPES.has(file.type);

  if (!isVideo && !isPhoto) {
    return { ok: false, error: "Nur Bilder (JPG, PNG, WebP) oder Video (MP4, MOV) erlaubt." };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Video zu groß (max. 100 MB)." };
  }
  if (isPhoto && file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Datei zu groß (max. 8 MB)." };
  }

  const ext = isVideo
    ? file.type.includes("quicktime")
      ? "mov"
      : "mp4"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `meldung/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("[uploadMeldungMedia]", error.message);
    return { ok: false, error: "Upload fehlgeschlagen." };
  }

  const { data } = supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .getPublicUrl(path);

  return { ok: true, publicUrl: data.publicUrl, typ: isVideo ? "video" : "foto" };
}
