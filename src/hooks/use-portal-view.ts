"use client";

import { useEffect, useState } from "react";

import {
  PORTAL_DESKTOP_MIN_PX,
  resolvePortalView,
  type PortalView,
} from "@/lib/portal2/viewport";

/**
 * TEIL G3 — realer Viewport-Breakpoint (kein Mock-Toggle).
 */
export function usePortalView(
  desktopMin = PORTAL_DESKTOP_MIN_PX
): PortalView {
  const [view, setView] = useState<PortalView>(() => {
    if (typeof window === "undefined") return "desktop";
    return resolvePortalView(window.innerWidth, desktopMin);
  });

  useEffect(() => {
    function sync() {
      setView(resolvePortalView(window.innerWidth, desktopMin));
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [desktopMin]);

  return view;
}
