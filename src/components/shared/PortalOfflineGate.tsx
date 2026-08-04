"use client";

import { useEffect, useState, type ReactNode } from "react";

import { PortalOfflineState } from "@/components/shared/PortalStateView";

type Props = {
  children: ReactNode;
};

/**
 * Zeigt Mock-`offline`-State, sobald `navigator.onLine` false ist.
 * E3: Jeder Portal-Screen unter PortalShell profitiert davon
 * (Kunde / HV / Partner / Eigentümer).
 */
export function PortalOfflineGate({ children }: Props) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }
    sync();
    setReady(true);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Ersten Paint nicht flashen — erst nach Mount prüfen.
  if (ready && !online) {
    return (
      <PortalOfflineState
        onPrimary={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}
