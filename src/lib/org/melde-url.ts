import QRCode from "qrcode";

import { SITE_CONFIG } from "@/lib/config";

/** Slug für Meldungen ohne zugeordnetes Objekt (Org-Einstieg ohne Gebäude). */
export const MELDE_ALLGEMEIN_SLUG = "allgemein";

const CANONICAL_PUBLIC_ORIGIN = "https://baerenwaldmuenchen.de";

/**
 * Öffentliche Origin für Melde-Links.
 * Print/QR immer kanonische Domain — nie Preview/localhost (sonst nicht scannbar).
 */
export function portalOrigin(opts?: { forPrint?: boolean }): string {
  if (opts?.forPrint) return CANONICAL_PUBLIC_ORIGIN;
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (env) return env;
  return SITE_CONFIG.url.replace(/\/$/, "");
}

export function buildMeldeUrl(
  orgKennung: string,
  objektSlug?: string,
  opts?: { forPrint?: boolean }
): string {
  const org = orgKennung.trim().toLowerCase();
  const base = `${portalOrigin(opts)}/melden/${encodeURIComponent(org)}`;
  if (objektSlug?.trim()) {
    return `${base}/${encodeURIComponent(objektSlug.trim().toLowerCase())}`;
  }
  return base;
}

export function buildEinladungUrl(token: string): string {
  return `${portalOrigin()}/melden/ergaenzen/${encodeURIComponent(token)}`;
}

/** @deprecated Externer QR-API-Link — bevorzugt `generateMeldeQrPng`. */
export function buildMeldeQrUrl(meldeUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=2&ecc=M&data=${encodeURIComponent(meldeUrl)}`;
}

/**
 * QR als PNG (lokal) — hoher Kontrast, Quiet Zone, Error Correction M.
 * Immer absolute https-URL übergeben (buildMeldeUrl(..., { forPrint: true })).
 */
export async function generateMeldeQrPng(
  meldeUrl: string,
  sizePx = 480
): Promise<Uint8Array> {
  const url = meldeUrl.trim();
  if (!/^https:\/\//i.test(url)) {
    throw new Error(`Melde-URL für QR muss https sein: ${url}`);
  }
  const buf = await QRCode.toBuffer(url, {
    type: "png",
    width: sizePx,
    // Quiet Zone ≥ 4 Module — wichtig für Handy-Kameras
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return new Uint8Array(buf);
}
