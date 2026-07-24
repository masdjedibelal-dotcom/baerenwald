/**
 * pdf-lib kann nur PNG/JPEG — HV-Logos liegen oft als WebP.
 * Konvertiert Bytes nach PNG. Canvas wird lazy geladen (Netlify-sicher).
 */
export async function imageBytesToPng(
  bytes: Uint8Array | null | undefined,
  opts?: { maxEdge?: number }
): Promise<Uint8Array | null> {
  if (!bytes?.length) return null;
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(Buffer.from(bytes));
    const maxEdge = opts?.maxEdge ?? 512;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return new Uint8Array(canvas.toBuffer("image/png"));
  } catch (e) {
    console.warn(
      "[aushang] Bild→PNG fehlgeschlagen:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

/**
 * Cover-Crop auf feste Pixelgröße als PNG — ohne PDF-Clip (Chrome/PDFium-sicher).
 */
export async function imageBytesToCoverPng(
  bytes: Uint8Array | null | undefined,
  targetW: number,
  targetH: number
): Promise<Uint8Array | null> {
  if (!bytes?.length || targetW < 1 || targetH < 1) return null;
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(Buffer.from(bytes));
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    const canvas = createCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, (targetW - sw) / 2, (targetH - sh) / 2, sw, sh);
    return new Uint8Array(canvas.toBuffer("image/png"));
  } catch (e) {
    console.warn(
      "[aushang] Cover-Crop fehlgeschlagen:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}
