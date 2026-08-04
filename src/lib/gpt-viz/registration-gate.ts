import type { GptChatBlock } from "@/lib/guided-chat/types";

import type { GptVizLimitCode } from "./limits";

export type GptRegistrationGateState = {
  message: string;
  limitCode: GptVizLimitCode;
  portalRegisterUrl: string;
  retryAfter: string | null;
};

/** Limits, die eine nicht schließbare Registrierungs-Pflicht auslösen. */
export function limitRequiresRegistrationGate(code: GptVizLimitCode): boolean {
  return (
    code === "visitor_sessions" ||
    code === "guest_exhausted" ||
    code === "session_exhausted"
  );
}

export function limitAllowsRetryWithoutRegister(code: GptVizLimitCode): boolean {
  return code === "visitor_sessions";
}

export function gateFromLimitPayload(
  message: string,
  limitCode: GptVizLimitCode | undefined,
  portalRegisterUrl: string,
  retryAfter?: string | null
): GptRegistrationGateState | null {
  if (!limitCode || !limitRequiresRegistrationGate(limitCode)) return null;
  return {
    message,
    limitCode,
    portalRegisterUrl,
    retryAfter: limitAllowsRetryWithoutRegister(limitCode) ? (retryAfter ?? null) : null,
  };
}

export function gateFromVizLimitBlock(
  message: string,
  block: Extract<GptChatBlock, { type: "viz_limit" }>
): GptRegistrationGateState | null {
  if (block.reason === "needs_lead" || block.reason === "portal_monthly") return null;
  return {
    message,
    limitCode: "guest_exhausted",
    portalRegisterUrl: block.portalRegisterUrl,
    retryAfter: null,
  };
}

export function formatRetryCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "";
  const totalSec = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return `${days} Tag${days === 1 ? "" : "e"}, ${hours} Std.`;
  }
  if (hours > 0) {
    return `${hours} Std., ${minutes} Min.`;
  }
  if (minutes > 0) {
    return `${minutes} Min., ${seconds} Sek.`;
  }
  return `${seconds} Sek.`;
}
