"use client";

import { useEffect, useState, type ReactNode } from "react";

import { PortalOfflineState } from "@/components/shared/PortalStateView";

type Props = {
  children: ReactNode;
};

/**
 * Zeigt Mock-`offline`-State, sobald `navigator.onLine` false ist.
 * Jeder Portal-Screen unter PortalShell profitiert davon.
 */
export function PortalOfflineGate({ children }: Props) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!online) {
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
