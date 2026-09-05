"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import {
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * router.refresh() mit sichtbarem Portal-Busy (Shell-Loading).
 * In allen Portalen nach Speichern / Statuswechsel nutzen.
 */
export function usePortalRefresh() {
  const router = useRouter();
  const { runBusy, flash, isHeld } = usePortalBusy();

  const refresh = useCallback(
    async (msMin = PORTAL_BUSY_MIN_MS) => {
      /** Bereits in runBusy/hold — kein zweites Hold (sonst endet Overlay zu früh). */
      if (isHeld()) {
        router.refresh();
        await wait(msMin);
        return;
      }
      await runBusy(async () => {
        router.refresh();
        await wait(msMin);
      }, msMin);
    },
    [router, runBusy, isHeld]
  );

  /** Sofort flashen + refresh (z. B. nach Nav ohne Await). */
  const refreshFlash = useCallback(
    (ms = PORTAL_BUSY_MIN_MS) => {
      flash(ms);
      router.refresh();
    },
    [flash, router]
  );

  return { refresh, refreshFlash };
}
