"use client";

import { useCallback, useState } from "react";

import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";

/**
 * Loading-Screen bei Uploads: Shell-Overlay + lokaler Busy,
 * auch bei kurzer Latenz mind. {@link PORTAL_BUSY_MIN_MS}.
 */
export function usePortalUploadBusy() {
  const { runBusy } = usePortalBusy();
  const [uploadBusy, setUploadBusy] = useState(false);

  const runUpload = useCallback(
    async <T,>(fn: () => Promise<T>, msMin = PORTAL_BUSY_MIN_MS): Promise<T> => {
      paintPortalBusyNow(setUploadBusy);
      const started = Date.now();
      try {
        return await runBusy(fn, msMin);
      } finally {
        const wait = Math.max(0, msMin - (Date.now() - started));
        if (wait > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, wait);
          });
        }
        setUploadBusy(false);
      }
    },
    [runBusy]
  );

  return { uploadBusy, runUpload };
}
