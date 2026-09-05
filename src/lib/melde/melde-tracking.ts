import { randomBytes } from "crypto";

/** URL-sicherer Tracking-Token für Mieter-Statusseite. */
export function generateMeldeTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

export function meldeStatusUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/melden/status/${token}`;
}
