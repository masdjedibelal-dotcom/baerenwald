import { SITE_CONFIG } from "@/lib/config";

export function portalAuthCallbackUrl(): string {
  return `${SITE_CONFIG.url}/portal/auth/callback`;
}
