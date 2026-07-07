"use server";

import {
  verifyPartnerRegistrationEmail as verifyImpl,
  type PartnerRegistrationCheckResult,
} from "@/lib/partner/partner-registration-eligibility";

export type { PartnerRegistrationCheckResult };

export async function verifyPartnerRegistrationEmail(
  email: string
): Promise<PartnerRegistrationCheckResult> {
  return verifyImpl(email);
}
