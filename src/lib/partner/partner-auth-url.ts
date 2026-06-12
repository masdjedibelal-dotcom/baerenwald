import { SITE_CONFIG } from "@/lib/config";

const partnerCallbackBase = () => `${SITE_CONFIG.url}/partner/auth/callback`;

export function partnerAuthCallbackUrl(nextPath = "/partner"): string {
  const base = partnerCallbackBase();
  if (nextPath === "/partner") return base;
  return `${base}?next=${encodeURIComponent(nextPath)}`;
}

export function partnerPasswordResetCallbackUrl(): string {
  return `${SITE_CONFIG.url}/partner/passwort-neu`;
}
