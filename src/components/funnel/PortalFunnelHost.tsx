"use client";

import "@/app/funnel-ui.css";

import { PortalFunnelHostView } from "@/components/funnel/portal-host/PortalFunnelHostView";
import type { PortalFunnelHostProps } from "@/components/funnel/portal-funnel-types";
import { usePortalFunnelHost } from "@/components/funnel/use-portal-funnel-host";

export type {
  PortalFunnelObjekt,
  PortalFunnelMeldeCtx,
  PortalFunnelPrefill,
} from "@/components/funnel/portal-funnel-types";

/**
 * Gemeinsamer Portal-/Melde-Funnel auf Basis Website-Design.
 * Trust/GPT entfallen; Felder und Preis je `funnelVariant(channel)`.
 */
export function PortalFunnelHost(props: PortalFunnelHostProps) {
  const model = usePortalFunnelHost(props);
  return <PortalFunnelHostView {...model} />;
}
