import { randomUUID } from "crypto";

import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const PARTNER_UPLOAD_BUCKET = "handwerker-uploads";

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 8;

function extFromMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export function isStoragePath(value: string): boolean {
  const v = value.trim();
  return Boolean(v) && !/^https?:\/\//i.test(v);
}

/** Signierte URL für private Storage-Pfade (1 h). */
export async function resolvePartnerFileUrl(
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored?.trim() || !isSupabaseConfigured()) return null;
  const raw = stored.trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const path = raw.startsWith(`${PARTNER_UPLOAD_BUCKET}/`)
    ? raw.slice(`${PARTNER_UPLOAD_BUCKET}/`.length)
    : raw;

  const { data, error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadPartnerPdf(opts: {
  handwerkerId: string;
  anfrageId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const mime = opts.file.type || "application/pdf";
  if (mime !== "application/pdf") {
    return { ok: false, error: "Bitte eine PDF-Datei hochladen." };
  }
  if (opts.file.size > MAX_PDF_BYTES) {
    return { ok: false, error: "PDF ist zu groß (max. 12 MB)." };
  }

  const path = `${opts.handwerkerId}/angebote/${opts.anfrageId}/angebot-${randomUUID()}.pdf`;
  const buf = Buffer.from(await opts.file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function uploadPartnerPhotos(opts: {
  handwerkerId: string;
  auftragId: string;
  files: File[];
}): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  const list = opts.files.slice(0, MAX_PHOTOS);
  if (!list.length) return { ok: true, paths: [] };

  const paths: string[] = [];

  for (const file of list) {
    const mime = file.type || "image/jpeg";
    if (!allowed.has(mime)) {
      return { ok: false, error: "Nur JPG, PNG oder WebP erlaubt." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Ein Foto ist zu groß (max. 8 MB)." };
    }

    const ext = extFromMime(mime);
    const path = `${opts.handwerkerId}/bautagebuch/${opts.auftragId}/${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from(PARTNER_UPLOAD_BUCKET)
      .upload(path, buf, { contentType: mime, upsert: false });

    if (error) return { ok: false, error: error.message };
    paths.push(path);
  }

  return { ok: true, paths };
}

export async function resolvePartnerFileUrls(
  stored: string[] | null | undefined
): Promise<string[]> {
  if (!stored?.length) return [];
  const out: string[] = [];
  for (const s of stored) {
    const url = await resolvePartnerFileUrl(s);
    if (url) out.push(url);
  }
  return out;
}
