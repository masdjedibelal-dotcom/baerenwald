/** Grenzen für Partner-Uploads (Client + Server). */

export const PARTNER_MAX_PDF_BYTES = 10 * 1024 * 1024;
export const PARTNER_MAX_PHOTO_BYTES = 6 * 1024 * 1024;
/** Max. Anhänge (Fotos + PDF) pro Bautagebuch-Eintrag. */
export const PARTNER_MAX_BAUTAGEBUCH_ANHAENGE = 5;
/** Max. PDFs bei Angebotseinreichung (ohne Rechnung). */
export const PARTNER_MAX_ANGEBOT_DATEIEN = 3;
/** @deprecated Alias — gleiche Grenze wie Anhänge gesamt. */
export const PARTNER_MAX_BAUTAGEBUCH_PHOTOS = PARTNER_MAX_BAUTAGEBUCH_ANHAENGE;

export const PARTNER_MAX_PDF_MB = PARTNER_MAX_PDF_BYTES / (1024 * 1024);
export const PARTNER_MAX_PHOTO_MB = PARTNER_MAX_PHOTO_BYTES / (1024 * 1024);

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
  const mime = (file.type || "image/jpeg").toLowerCase();
  if (!allowed.has(mime)) {
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

/** Foto oder PDF für Bautagebuch. */
export function validatePartnerBautagebuchFile(file: File): string | null {
  if (isPdfFile(file)) {
    return validatePartnerPdfFile(file);
  }
  return validatePartnerPhotoFile(file);
}

export function validatePartnerBautagebuchFiles(
  files: File[],
  existingCount = 0
): string | null {
  const max = PARTNER_MAX_BAUTAGEBUCH_ANHAENGE;
  if (existingCount + files.length > max) {
    const rest = Math.max(0, max - existingCount);
    return rest === 0
      ? `Maximal ${max} Anhänge pro Eintrag — bitte zuerst bestehende entfernen.`
      : `Maximal ${max} Anhänge pro Eintrag (noch ${rest} möglich).`;
  }
  for (const file of files) {
    const err = validatePartnerBautagebuchFile(file);
    if (err) return err;
  }
  return null;
}

export function validatePartnerAngebotFiles(files: File[]): string | null {
  const list = files.filter((f) => f.size > 0);
  if (!list.length) {
    return "Bitte mindestens ein Angebots-PDF hochladen.";
  }
  if (list.length > PARTNER_MAX_ANGEBOT_DATEIEN) {
    return `Maximal ${PARTNER_MAX_ANGEBOT_DATEIEN} PDF-Dateien pro Angebot.`;
  }
  for (const file of list) {
    const err = validatePartnerPdfFile(file);
    if (err) return err;
  }
  return null;
}
