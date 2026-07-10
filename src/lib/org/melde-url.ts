import { SITE_CONFIG } from "@/lib/config";

function portalOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return SITE_CONFIG.url.replace(/\/$/, "");
}

export function buildMeldeUrl(orgKennung: string, objektSlug?: string): string {
  const org = orgKennung.trim().toLowerCase();
  const base = `${portalOrigin()}/melden/${encodeURIComponent(org)}`;
  if (objektSlug?.trim()) {
    return `${base}/${encodeURIComponent(objektSlug.trim().toLowerCase())}`;
  }
  return base;
}

export function buildEinladungUrl(token: string): string {
  return `${portalOrigin()}/melden/ergaenzen/${encodeURIComponent(token)}`;
}

export function buildMeldeQrUrl(meldeUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(meldeUrl)}`;
}
