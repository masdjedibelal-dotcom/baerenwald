import { SITE_CONFIG } from "@/lib/config";

export function partnerPasswordResetCallbackUrl(): string {
  return `${SITE_CONFIG.url}/partner/passwort-neu`;
}
