import type { PortalFunnelStepId } from "@/components/funnel/portal-funnel-types";
import type { FunnelChannel, FunnelVariantConfig } from "@/lib/funnel/funnel-variant";
import {
  getMeldeKaputtFachfragen,
  isMeldeKaputtChannel,
  type MeldeFrageVoice,
} from "@/lib/funnel/melde-kaputt-flow";
import {
  mapResolvedStepsToPortalMid,
  shouldUseWebsiteMidSteps,
} from "@/lib/funnel/portal-funnel-mid-steps";
import type { FunnelState, FunnelStep } from "@/lib/funnel/types";

/** Nächster Schritt nach Fachdetails — auch wenn `fachdetail` aus der Order gefallen ist. */
export function stepAfterFachdetail(
  order: PortalFunnelStepId[]
): PortalFunnelStepId | null {
  const afterFach = order.indexOf("fachdetail");
  if (afterFach >= 0) return order[afterFach + 1] ?? null;
  const fallback: PortalFunnelStepId[] = [
    "groesse",
    "bad_ausstattung",
    "zugaenglichkeit",
    "zustand",
    "medien",
    "beschreibung",
    "kontakt",
    "result",
  ];
  return fallback.find((id) => order.includes(id)) ?? null;
}

export type BuildStepOrderArgs = {
  cfg: Pick<FunnelVariantConfig, "forceKaputt" | "prefix" | "include">;
  state: FunnelState;
  channel: FunnelChannel;
  resolvedWebsiteSteps: FunnelStep[];
  groesseConfig: unknown;
  meldeFrageVoice: MeldeFrageVoice;
};

export function buildStepOrder({
  cfg,
  state,
  channel,
  resolvedWebsiteSteps,
  groesseConfig,
  meldeFrageVoice,
}: BuildStepOrderArgs): PortalFunnelStepId[] {
  const out: PortalFunnelStepId[] = [];
  if (
    cfg.prefix.objekt === "required" ||
    cfg.prefix.objekt === "optional"
  ) {
    out.push("objekt");
  }
  if (
    cfg.prefix.mieter === "required" ||
    cfg.prefix.mieter === "optional" ||
    cfg.prefix.mieter === "ohne_erlaubt"
  ) {
    out.push("mieter");
  }
  if (!cfg.forceKaputt) out.push("situation");
  out.push("bereiche");
  const meldeKaputt =
    isMeldeKaputtChannel(channel) && state.situation === "kaputt";
  /** Kaputt-Melde-Flow: Dringlichkeit entfällt (Auto-Akut je Bereich). */
  if (
    cfg.include.notfallDringlichkeit &&
    state.situation === "kaputt" &&
    !meldeKaputt
  ) {
    out.push("dringlichkeit");
  }
  if (meldeKaputt) {
    const b = state.bereiche[0];
    if (
      b &&
      getMeldeKaputtFachfragen(
        b,
        state.fachdetails?.fachdetailAnswers,
        meldeFrageVoice
      ).length > 0
    ) {
      out.push("fachdetail");
    }
  } else if (shouldUseWebsiteMidSteps(state.situation, false)) {
    const mid = mapResolvedStepsToPortalMid(resolvedWebsiteSteps, state, {
      skipDringlichkeit: out.includes("dringlichkeit"),
    });
    for (const id of mid) {
      if (id === "groesse" && !groesseConfig) continue;
      out.push(id);
    }
  }
  /** Umbau & Modernisierung: keine Fotos. */
  if (cfg.include.photos && state.situation !== "erneuern") {
    out.push("medien");
  }
  if (cfg.include.beschreibung) out.push("beschreibung");
  /** Privat / Melde / eingeloggter Mieter: Kontakt (+ Adresse) vor Ergebnis. */
  if (cfg.include.ortPlz && channel === "portal_privat") {
    out.push("kontakt");
  } else if (channel === "melde_anon" || channel === "portal_mieter") {
    out.push("kontakt");
  }
  out.push("result");
  return out;
}
