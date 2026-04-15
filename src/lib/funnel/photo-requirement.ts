import type { FunnelState } from "./types";

/** Fotos am Lead-Screen sind optional (kein Minimum). */
export function isBwLeadPhotoRequired(_state: FunnelState): boolean {
  return false;
}
