import { randomUUID } from "crypto";

import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_BAUTAGEBUCH_ANHAENGE,
  validatePartnerAngebotFiles,
  validatePartnerBautagebuchFile,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

export const PARTNER_UPLOAD_BUCKET = "handwerker-uploads";

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
/** Standard 1 h; für E-Mails z. B. 7 Tage (604800). */
export async function resolvePartnerFileUrl(
  stored: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!stored?.trim() || !isSupabaseConfigured()) return null;
  const raw = stored.trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const path = raw.startsWith(`${PARTNER_UPLOAD_BUCKET}/`)
    ? raw.slice(`${PARTNER_UPLOAD_BUCKET}/`.length)
    : raw;

  const { data, error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadPartnerPdf(opts: {
  handwerkerId: string;
  anfrageId: string;
  file: File;
  /** Standard: Angebots-PDF. `rechnung` → separater Storage-Pfad. */
  kind?: "angebot" | "rechnung";
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const pdfErr = validatePartnerPdfFile(opts.file);
  if (pdfErr) {
    return { ok: false, error: pdfErr };
  }
  const mime = opts.file.type || "application/pdf";

  const prefix =
    opts.kind === "rechnung"
      ? `${opts.handwerkerId}/angebote/${opts.anfrageId}/rechnung`
      : `${opts.handwerkerId}/angebote/${opts.anfrageId}/angebot`;
  const path = `${prefix}-${randomUUID()}.pdf`;
  const buf = Buffer.from(await opts.file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** Abnahmeprotokoll-PDF (Auftrag). */
export async function uploadAbnahmeProtokollPdf(opts: {
  handwerkerId: string;
  auftragId: string;
  pdfBytes: Uint8Array;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const path = `${opts.handwerkerId}/auftraege/${opts.auftragId}/abnahme-${randomUUID()}.pdf`;
  const buf = Buffer.from(opts.pdfBytes);

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: "application/pdf", upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** Generiertes Partner-PDF (Angebot/Rechnung) als Bytes. */
export async function uploadPartnerGeneratedPdf(opts: {
  handwerkerId: string;
  anfrageId: string;
  pdfBytes: Uint8Array;
  kind: "angebot" | "rechnung";
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const prefix =
    opts.kind === "rechnung"
      ? `${opts.handwerkerId}/angebote/${opts.anfrageId}/rechnung-auto`
      : `${opts.handwerkerId}/angebote/${opts.anfrageId}/angebot-auto`;
  const path = `${prefix}-${randomUUID()}.pdf`;
  const buf = Buffer.from(opts.pdfBytes);

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: "application/pdf", upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** Firmenlogo (PNG/JPEG/WebP), max. ~2 MB. */
export async function uploadPartnerLogo(opts: {
  handwerkerId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const mime = opts.file.type || "";
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(mime)) {
    return { ok: false, error: "Bitte PNG, JPG oder WebP hochladen." };
  }
  if (opts.file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Logo max. 2 MB." };
  }

  const ext = extFromMime(mime);
  const path = `${opts.handwerkerId}/firma/logo-${randomUUID()}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function uploadPartnerAngebotPdfs(opts: {
  handwerkerId: string;
  anfrageId: string;
  files: File[];
}): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const list = opts.files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
  const batchErr = validatePartnerAngebotFiles(list);
  if (batchErr) {
    return { ok: false, error: batchErr };
  }

  const paths: string[] = [];
  for (const file of list) {
    const up = await uploadPartnerPdf({
      handwerkerId: opts.handwerkerId,
      anfrageId: opts.anfrageId,
      file,
    });
    if (!up.ok) return up;
    paths.push(up.path);
  }

  return { ok: true, paths };
}

export async function uploadPartnerBautagebuchAnhaenge(opts: {
  handwerkerId: string;
  auftragId: string;
  files: File[];
  /** Bereits gespeicherte Anzahl (bei Bearbeitung). */
  existingCount?: number;
}): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const existing = opts.existingCount ?? 0;
  const maxNew = Math.max(0, PARTNER_MAX_BAUTAGEBUCH_ANHAENGE - existing);
  const list = opts.files.slice(0, maxNew);
  if (!list.length) {
    if (opts.files.length > 0 && maxNew === 0) {
      return {
        ok: false,
        error: `Maximal ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} Anhänge pro Eintrag.`,
      };
    }
    return { ok: true, paths: [] };
  }

  const paths: string[] = [];

  for (const file of list) {
    const err = validatePartnerBautagebuchFile(file);
    if (err) {
      return { ok: false, error: err };
    }
    const mime =
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

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

/** Foto für Positions-Eintrag (Lebenszyklus). */
export async function uploadPartnerEintragFoto(opts: {
  handwerkerId: string;
  auftragId: string;
  positionId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }
  const err = validatePartnerBautagebuchFile(opts.file);
  if (err) return { ok: false, error: err };

  const mime = opts.file.type || "image/jpeg";
  if (!/^image\//i.test(mime)) {
    return { ok: false, error: "Bitte ein Foto aufnehmen." };
  }

  const ext = extFromMime(mime);
  const path = `${opts.handwerkerId}/position-eintraege/${opts.auftragId}/${opts.positionId}/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** @deprecated — nutze uploadPartnerBautagebuchAnhaenge */
export const uploadPartnerPhotos = uploadPartnerBautagebuchAnhaenge;

export async function uploadPartnerComplianceDoc(opts: {
  handwerkerId: string;
  auftragId?: string | null;
  typ: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Storage nicht konfiguriert." };
  }

  const mime = opts.file.type || "application/pdf";
  const isPdf = mime === "application/pdf" || opts.file.name.toLowerCase().endsWith(".pdf");
  const err = isPdf
    ? validatePartnerPdfFile(opts.file)
    : validatePartnerBautagebuchFile(opts.file);
  if (err) return { ok: false, error: err };

  const ext = extFromMime(isPdf ? "application/pdf" : mime);
  const scope = opts.auftragId?.trim() ? `auftrag/${opts.auftragId}` : "stamm";
  const path = `${opts.handwerkerId}/compliance/${scope}/${opts.typ}-${randomUUID()}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .upload(path, buf, {
      contentType: isPdf ? "application/pdf" : mime,
      upsert: false,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
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
