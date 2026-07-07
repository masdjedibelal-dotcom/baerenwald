import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function uploadMeldungFoto(
  leadId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Nur JPG, PNG oder WebP erlaubt." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Datei zu groß (max. 8 MB)." };
  }

  const ext =
    file.type === "image/png"
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
    console.error("[uploadMeldungFoto]", error.message);
    return { ok: false, error: "Upload fehlgeschlagen." };
  }

  const { data } = supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .getPublicUrl(path);

  return { ok: true, publicUrl: data.publicUrl };
}
