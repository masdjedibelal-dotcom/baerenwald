import type { FunnelState } from "./types";

/**
 * Am Lead-Screen mindestens 2 Fotos — ausgenommen Betreuung und
 * Neubau in früher Planungsphase („Nur eine Idee“).
 */
export function isBwLeadPhotoRequired(state: FunnelState): boolean {
  if (state.situation === "betreuung") return false;
  if (state.situation === "neubauen" && state.umfang === "idee") {
    return false;
  }
  return true;
}
