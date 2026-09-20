import { optimizeImageForUpload } from "@/lib/media/optimize-image-for-upload";
import { PARTNER_MAX_PHOTO_BYTES } from "@/lib/partner/partner-upload-limits";

function isLikelyHeic(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/**
 * Kamera-/Galerie-Fotos für Partner-Uploads:
 * gemeinsame Kompression (max 2000px, JPEG ~0.8).
 */
export async function normalizePartnerCameraPhoto(file: File): Promise<File> {
  if (!file.size) return file;
  if ((file.type || "").toLowerCase() === "application/pdf") return file;
  if (file.name.toLowerCase().endsWith(".pdf")) return file;

  try {
    const out = await optimizeImageForUpload(file, {
      maxEdge: 2000,
      maxBytes: Math.min(1.5 * 1024 * 1024, PARTNER_MAX_PHOTO_BYTES * 0.35),
    });
    if (out.size > PARTNER_MAX_PHOTO_BYTES) {
      throw new Error("Foto bleibt nach Verkleinerung zu groß.");
    }
    return out;
  } catch {
    /* Fallback unten */
  }

  if (isLikelyHeic(file) || file.size > PARTNER_MAX_PHOTO_BYTES) {
    throw new Error(
      "Foto konnte nicht verkleinert werden. Bitte erneut mit der Kamera aufnehmen."
    );
  }
  return file;
}
