import { PARTNER_MAX_PHOTO_BYTES } from "@/lib/partner/partner-upload-limits";

const MAX_EDGE = 1920;

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

/**
 * Kamera-/Galerie-Fotos für Partner-Uploads aufnehmen:
 * HEIC → JPEG, große Aufnahmen runterrechnen (unter PARTNER_MAX_PHOTO_BYTES).
 */
export async function normalizePartnerCameraPhoto(file: File): Promise<File> {
  if (!file.size) return file;
  if ((file.type || "").toLowerCase() === "application/pdf") return file;
  if (file.name.toLowerCase().endsWith(".pdf")) return file;

  const needsConvert =
    isLikelyHeic(file) ||
    file.size > PARTNER_MAX_PHOTO_BYTES * 0.85 ||
    !file.type ||
    !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
      file.type.toLowerCase()
    );

  if (!needsConvert && file.size <= PARTNER_MAX_PHOTO_BYTES) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        const ratio = Math.min(MAX_EDGE / width, MAX_EDGE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size > PARTNER_MAX_PHOTO_BYTES && quality > 0.45) {
              tryQuality(Math.max(0.45, quality - 0.15));
              return;
            }
            resolve(
              new File([blob], jpegName(file.name), {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          quality
        );
      };

      tryQuality(0.82);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
