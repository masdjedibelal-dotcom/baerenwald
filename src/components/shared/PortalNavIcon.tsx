"use client";

import { MockIcon } from "@/components/shared/MockIcon";
import {
  PORTAL_NAV_ICONS,
  type MockIconCtx,
  type MockIconName,
} from "@/lib/portal2/mock-icons";

/** Nav-Eintrag → MockIcon (für Shell B2). */
export function PortalNavIcon({
  navId,
  active,
  size = 18,
  surface = "sidebar",
}: {
  navId: string;
  active?: boolean;
  size?: number;
  surface?: "sidebar" | "nav";
}) {
  const n = (PORTAL_NAV_ICONS as Record<string, MockIconName>)[navId] ?? "list";
  const ctx: MockIconCtx =
    surface === "sidebar"
      ? active
        ? "sidebar-active"
        : "sidebar"
      : active
        ? "nav-active"
        : "nav";
  return <MockIcon n={n} ctx={ctx} size={size} />;
}
