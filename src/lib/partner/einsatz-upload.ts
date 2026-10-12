"use client";

import {
  einsatzUploadZiel,
  type EinsatzUploadOrdner,
  type HochgeladeneDatei,
} from "@/app/actions/partner-einsatz";
import { optimizeImageForUpload } from "@/lib/media/optimize-image-for-upload";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Gleicher Bucket wie PARTNER_UPLOAD_BUCKET (partner-storage ist server-seitig). */
const BUCKET = "handwerker-uploads";
const MAX_BYTES = 10 * 1024 * 1024;
const ERLAUBT = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function endung(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function mimeVon(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (t) return t === "image/jpg" ? "image/jpeg" : t;
  return file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";
}

/**
 * Dateien direkt vom Gerät in den Partner-Ordner des Einsatzes laden (nicht über Netlify —
 * dort ist bei ~4,5 MB je Anfrage Schluss). Fotos werden vorher verkleinert.
 */
export async function ladeEinsatzDateienHoch(
  einsatzId: string,
  ordner: EinsatzUploadOrdner,
  files: File[]
): Promise<{ ok: true; dateien: HochgeladeneDatei[] } | { ok: false; error: string }> {
  if (!files.length) return { ok: true, dateien: [] };
  const ziel = await einsatzUploadZiel(einsatzId, ordner);
  if (!ziel.ok) return ziel;
  const supabase = getSupabaseBrowserClient();
  const out: HochgeladeneDatei[] = [];
  for (const roh of files) {
    let file = roh;
    if (mimeVon(roh).startsWith("image/")) {
      try {
        file = await optimizeImageForUpload(roh, { maxEdge: 2400 });
      } catch {
        file = roh;
      }
    }
    const mime = mimeVon(file);
    if (!ERLAUBT.includes(mime)) {
      return { ok: false, error: `„${roh.name}“: bitte nur PDF oder Fotos (JPG, PNG, WebP).` };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `„${roh.name}“ ist größer als 10 MB.` };
    }
    const path = `${ziel.prefix}${crypto.randomUUID()}.${endung(mime)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false });
    if (error) {
      console.error("[ladeEinsatzDateienHoch]", error);
      return { ok: false, error: `„${roh.name}“ konnte nicht hochgeladen werden. Bitte erneut versuchen.` };
    }
    out.push({ name: roh.name || "Datei", path, mime, size: file.size });
  }
  return { ok: true, dateien: out };
}
