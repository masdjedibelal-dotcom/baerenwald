/**
 * Portal 2.0 E4 — Einladungs-Token (portal_einladungen).
 * Mail: nur mailto / HV-Branding — nie Bärenwald-Absender (D10/G5).
 */

import { SITE_CONFIG } from "@/lib/config";

export const PORTAL_EINLADUNG_EXPIRES_DAYS = 30;

export type PortalEinladungStatus =
  | "offen"
  | "eingeloest"
  | "abgelaufen"
  | "entfallen";

function portalOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return SITE_CONFIG.url.replace(/\/$/, "");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** URL-sicheres Token (client- und server-tauglich). */
export function createPortalEinladungToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase64Url(bytes);
}

export function portalEinladungExpiresAt(
  from: Date = new Date(),
  days = PORTAL_EINLADUNG_EXPIRES_DAYS
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Registrierungs-Link (HV-Branding-Flow). */
export function buildPortalEinladungUrl(token: string): string {
  return `${portalOrigin()}/portal/einladung/${encodeURIComponent(token.trim())}`;
}

export function isPortalEinladungExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() < now.getTime();
}

export function resolvePortalEinladungStatus(row: {
  status: string;
  expires_at?: string | Date | null;
}): PortalEinladungStatus {
  const s = row.status as PortalEinladungStatus;
  if (s === "eingeloest" || s === "entfallen" || s === "abgelaufen") return s;
  if (isPortalEinladungExpired(row.expires_at)) return "abgelaufen";
  return "offen";
}

/** mailto mit HV-Name — Absender = Client-Mail des HV (D10). */
export function buildPortalEinladungMailto(opts: {
  link: string;
  hvName: string;
  objektLabel: string;
  einheitRef?: string | null;
}): string {
  const hv = opts.hvName.trim() || "Ihre Verwaltung";
  const objekt = opts.objektLabel.trim() || "Objekt";
  const we = opts.einheitRef?.trim();
  const where = we ? `${objekt} · ${we}` : objekt;
  const subj = encodeURIComponent(`Portal-Einladung — ${where}`);
  const body = encodeURIComponent(
    `Guten Tag,\n\n${hv} lädt Sie ein, Ihr Mieter-Konto anzulegen und Ihre Wohnung zu verknüpfen:\n\n${opts.link}\n\nDer Link ist persönlich und zeitlich begrenzt.\n\nViele Grüße\n${hv}`
  );
  return `mailto:?subject=${subj}&body=${body}`;
}
