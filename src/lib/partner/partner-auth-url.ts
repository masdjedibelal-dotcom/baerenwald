import { SITE_CONFIG } from "@/lib/config";

export function partnerAuthCallbackUrl(): string {
  return `${SITE_CONFIG.url}/partner/auth/callback`;
}
