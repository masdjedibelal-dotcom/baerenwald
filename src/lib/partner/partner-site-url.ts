import { SITE_CONFIG } from "@/lib/config";

export function partnerLoginUrl(): string {
  return `${SITE_CONFIG.url}/partner/login`;
}

export function partnerDashboardUrl(): string {
  return `${SITE_CONFIG.url}/partner`;
}
