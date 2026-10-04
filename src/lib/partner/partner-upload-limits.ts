/** Grenzen für Partner-Uploads (Client + Server). */

/**
 * Netlify nimmt je Anfrage nur rund 6 MB an (Server-Action-Body, teils Base64) —
 * darüber scheitert der Upload ohne Meldung. Deshalb PDF und Summe je Upload auf 4 MB.
 */
export const PARTNER_MAX_PDF_BYTES = 4 * 1024 * 1024;
export const PARTNER_MAX_UPLOAD_GESAMT_BYTES = 4 * 1024 * 1024;
/** Fotos werden vor dem Upload auf höchstens ~1,5 MB verkleinert. */
const FOTO_NACH_KOMPRESSION_BYTES = 1.5 * 1024 * 1024;
export const PARTNER_MAX_PHOTO_BYTES = 6 * 1024 * 1024;
/** Max. PDFs bei Angebotseinreichung (ohne Rechnung). */
export const PARTNER_MAX_ANGEBOT_DATEIEN = 3;

export function formatPartnerMaxMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

export function validatePartnerPdfFile(
  file: File | null | undefined
): string | null {
  if (!file || file.size === 0) {
    return "Bitte eine PDF-Datei auswählen.";
  }
  const mime = (file.type || "").toLowerCase();
  if (mime && mime !== "application/pdf") {
    return "Bitte nur PDF-Dateien hochladen.";
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && mime !== "application/pdf") {
    return "Bitte nur PDF-Dateien hochladen.";
  }
  if (file.size > PARTNER_MAX_PDF_BYTES) {
    return `Die PDF ist zu groß (max. ${formatPartnerMaxMb(PARTNER_MAX_PDF_BYTES)} MB).`;
  }
  return null;
}

export function validatePartnerPhotoFile(file: File): string | null {
  const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  const mime = (file.type || "").toLowerCase();
  if (mime.includes("heic") || mime.includes("heif")) {
    return "HEIC wird nicht unterstützt — bitte erneut mit Kamera aufnehmen (wird als JPG gespeichert).";
  }
  const byExt = /\.(jpe?g|png|webp)$/i.test(file.name);
  const effective = mime || (byExt ? "image/jpeg" : "");
  if (!allowed.has(effective) && !byExt) {
    return "Nur JPG, PNG oder WebP erlaubt.";
  }
  if (file.size > PARTNER_MAX_PHOTO_BYTES) {
    return `Ein Foto ist zu groß (max. ${formatPartnerMaxMb(PARTNER_MAX_PHOTO_BYTES)} MB).`;
  }
  return null;
}

function isPdfFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  return mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

/** Foto oder PDF für Bautagebuch. */
export function validatePartnerBautagebuchFile(file: File): string | null {
  if (isPdfFile(file)) {
    return validatePartnerPdfFile(file);
  }
  if (isImageFile(file)) {
    return validatePartnerPhotoFile(file);
  }
  return "Nur JPG, PNG, WebP oder PDF erlaubt.";
}

/** Summe je Upload (Fotos mit ihrer Größe nach Verkleinerung). */
function uploadGesamtFehler(files: File[]): string | null {
  const summe = files.reduce(
    (s, f) => s + (isImageFile(f) ? Math.min(f.size, FOTO_NACH_KOMPRESSION_BYTES) : f.size),
    0
  );
  if (summe > PARTNER_MAX_UPLOAD_GESAMT_BYTES) {
    return `Zusammen höchstens ${formatPartnerMaxMb(PARTNER_MAX_UPLOAD_GESAMT_BYTES)} MB pro Upload. Bitte weniger oder kleinere Dateien wählen.`;
  }
  return null;
}

/**
 * Unterlagen am Auftrag: Fotos (JPG/PNG/WebP) oder PDF —
 * gleiche Typen wie in der Dokumente-UI.
 */
export function validatePartnerAngebotFiles(
  files: File[],
  opts?: { required?: boolean }
): string | null {
  const list = files.filter((f) => f.size > 0);
  if (!list.length) {
    if (opts?.required === false) return null;
    return "Bitte mindestens eine Datei (Foto oder PDF) hochladen.";
  }
  if (list.length > PARTNER_MAX_ANGEBOT_DATEIEN) {
    return `Maximal ${PARTNER_MAX_ANGEBOT_DATEIEN} Dateien pro Upload.`;
  }
  for (const file of list) {
    const err = validatePartnerBautagebuchFile(file);
    if (err) return err;
  }
  return uploadGesamtFehler(list);
}
