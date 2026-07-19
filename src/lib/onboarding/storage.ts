export const ONBOARDING_PORTAL_KEY = "bw_onboarding_portal_v1_completed";
export const ONBOARDING_PARTNER_KEY = "bw_onboarding_partner_v1_completed";

export type OnboardingAudience = "portal" | "partner";

export function onboardingStorageKey(audience: OnboardingAudience): string {
  return audience === "portal" ? ONBOARDING_PORTAL_KEY : ONBOARDING_PARTNER_KEY;
}

export function isOnboardingCompleted(audience: OnboardingAudience): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(onboardingStorageKey(audience)) === "1";
}

export function markOnboardingCompleted(audience: OnboardingAudience): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(onboardingStorageKey(audience), "1");
}

export function clearOnboardingCompleted(audience: OnboardingAudience): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(onboardingStorageKey(audience));
}
