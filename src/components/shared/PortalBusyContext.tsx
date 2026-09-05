"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PortalBusyApi = {
  busy: boolean;
  /** Kurz Loading zeigen (z. B. nach Nav / Refresh). */
  flash: (ms?: number) => void;
  /** Busy während async Arbeit. */
  runBusy: <T>(fn: () => Promise<T>, msMin?: number) => Promise<T>;
};

const PortalBusyContext = createContext<PortalBusyApi | null>(null);

const DEFAULT_FLASH_MS = 320;

export function PortalBusyProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flash = useCallback(
    (ms = DEFAULT_FLASH_MS) => {
      clearTimer();
      setBusy(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (holdRef.current === 0) setBusy(false);
      }, Math.max(120, ms));
    },
    [clearTimer]
  );

  const runBusy = useCallback(
    async <T,>(fn: () => Promise<T>, msMin = DEFAULT_FLASH_MS): Promise<T> => {
      holdRef.current += 1;
      clearTimer();
      setBusy(true);
      const started = Date.now();
      try {
        return await fn();
      } finally {
        const wait = Math.max(0, msMin - (Date.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        holdRef.current = Math.max(0, holdRef.current - 1);
        if (holdRef.current === 0) setBusy(false);
      }
    },
    [clearTimer]
  );

  const api = useMemo(
    () => ({ busy, flash, runBusy }),
    [busy, flash, runBusy]
  );

  return (
    <PortalBusyContext.Provider value={api}>{children}</PortalBusyContext.Provider>
  );
}

export function usePortalBusy(): PortalBusyApi {
  const ctx = useContext(PortalBusyContext);
  if (!ctx) {
    return {
      busy: false,
      flash: () => undefined,
      runBusy: async (fn) => fn(),
    };
  }
  return ctx;
}
