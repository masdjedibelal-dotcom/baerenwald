import { GPT_VIZ_STORAGE_BUCKET } from "@/lib/gpt-viz/constants";
import { supabaseAdmin } from "@/lib/supabase";

export const ORG_MEDIA_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ORG_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

export type OrgMediaKind = "logo" | "hero" | "objekt-cover";

export function orgMediaExt(contentType: string): "png" | "webp" | "jpg" {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function assertOrgMediaFile(file: unknown):
  | { ok: true; file: File }
  | { ok: false; error: string; status: number } {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Datei fehlt.", status: 400 };
  }
  if (!ORG_MEDIA_PHOTO_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return {
      ok: false,
      error: "Nur Bilder (JPG, PNG, WebP) erlaubt.",
      status: 400,
    };
  }
  if (file.size > ORG_MEDIA_MAX_BYTES) {
    return { ok: false, error: "Datei zu groß (max. 8 MB).", status: 400 };
  }
  return { ok: true, file };
}

/** Upload in öffentlichen GPT-Viz-Bucket; liefert öffentliche URL. */
export async function uploadOrgPublicImage(opts: {
  kind: OrgMediaKind;
  kundeId: string;
  file: File;
  /** Zusätzlicher Pfadteil (z. B. objektId). */
  scopeId?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ext = orgMediaExt(opts.file.type);
  const scope = opts.scopeId ? `${opts.scopeId}/` : "";
  const path = `org-media/${opts.kind}/${opts.kundeId}/${scope}${Date.now()}.${ext}`;
  const buffer = Buffer.from(await opts.file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: opts.file.type || "image/jpeg",
      upsert: false,
    });

  if (upErr) {
    console.error(`[org-media/${opts.kind}]`, upErr.message);
    return { ok: false, error: "Upload fehlgeschlagen." };
  }

  const { data: pub } = supabaseAdmin.storage
    .from(GPT_VIZ_STORAGE_BUCKET)
    .getPublicUrl(path);

  return { ok: true, url: pub.publicUrl };
}
