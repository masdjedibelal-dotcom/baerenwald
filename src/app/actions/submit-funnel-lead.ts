"use server";

import {
  type PersistLeadInput,
  persistLead,
  type PersistLeadResult,
} from "@/lib/lead/persist-lead";

/** Gleicher Payload wie `/api/lead`, ohne Bearer — nur Server (Funnel auf derselben App). */
export async function submitFunnelLeadAction(
  input: PersistLeadInput
): Promise<PersistLeadResult> {
  return persistLead(input);
}
