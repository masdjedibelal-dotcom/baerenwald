import { PARTNER_MAX_PHOTO_BYTES } from "@/lib/partner/partner-upload-limits";

/** Lange Kante nach Verkleinerung — reicht für CRM/Bautagebuch. */
const MAX_EDGE = 1600;
/** Zielgröße nach Encode (Server-Action + Storage bleiben schlank). */
const TARGET_BYTES = Math.min(1.5 * 1024 * 1024, PARTNER_MAX_PHOTO_BYTES * 0.35);

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

function jpegName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.jpg`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Kamera-/Galerie-Fotos für Partner-Uploads:
 * immer auf JPEG + begrenzte Kante verdichten (auch wenn die Datei „nur“ 3–4 MB ist).
 * Verhindert Server-Action-Timeouts bei Regie mit Start/Ende/mehreren Fotos.
 */
export async function normalizePartnerCameraPhoto(file: File): Promise<File> {
  if (!file.size) return file;
  if ((file.type || "").toLowerCase() === "application/pdf") return file;
  if (file.name.toLowerCase().endsWith(".pdf")) return file;

  try {
    const img = await loadImage(file);
    let edge = MAX_EDGE;
    let quality = 0.78;

    for (let attempt = 0; attempt < 6; attempt++) {
      let { width, height } = img;
      if (width > edge || height > edge) {
        const ratio = Math.min(edge / width, edge / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToJpeg(canvas, quality);
      if (!blob) break;

      if (blob.size <= TARGET_BYTES || (quality <= 0.42 && edge <= 960)) {
        if (blob.size > PARTNER_MAX_PHOTO_BYTES) {
          throw new Error("Foto bleibt nach Verkleinerung zu groß.");
        }
        return new File([blob], jpegName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }

      if (quality > 0.42) {
        quality = Math.max(0.42, quality - 0.12);
      } else {
        edge = Math.max(960, Math.round(edge * 0.75));
        quality = 0.72;
      }
    }
  } catch {
    /* Fallback unten */
  }

  // HEIC o. Ä. nicht lesbar → Original nur behalten wenn unter Limit
  if (isLikelyHeic(file) || file.size > PARTNER_MAX_PHOTO_BYTES) {
    throw new Error(
      "Foto konnte nicht verkleinert werden. Bitte erneut mit der Kamera aufnehmen."
    );
  }
  return file;
}
