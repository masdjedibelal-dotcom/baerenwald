import { randomBytes } from "crypto";

import { publicSiteOrigin } from "@/lib/staging";

/** URL-sicherer Tracking-Token für Mieter-Statusseite. */
export function generateMeldeTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Relativer Pfad zur Statusseite (für next= / interne Links). */
export function meldeStatusPath(token: string): string {
  return `/melden/status/${token}`;
}

export function meldeStatusUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? publicSiteOrigin()).replace(/\/$/, "");
  return `${base}${meldeStatusPath(token)}`;
}

/** Absolute Prod-/Staging-URL → relativer Pfad (für Portal-Redirects). */
export function meldeStatusRelativePath(urlOrPath: string): string {
  const raw = urlOrPath.trim();
  if (!raw) return "/portal";
  if (raw.startsWith("/")) return raw;
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}${u.hash}` || "/portal";
  } catch {
    return raw.startsWith("melden/") ? `/${raw}` : raw;
  }
}
