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
import { flushSync } from "react-dom";

type PortalBusyApi = {
  busy: boolean;
  /** Kurz Loading zeigen (z. B. nach Nav ohne Detail-Fetch). */
  flash: (ms?: number) => void;
  /** Busy halten bis release() — für Klick → Zielseite. */
  hold: () => void;
  /** Hold beenden (mind. minMs seit erstem hold). */
  release: (msMin?: number) => void;
  /** Busy während async Arbeit. */
  runBusy: <T>(fn: () => Promise<T>, msMin?: number) => Promise<T>;
};

const PortalBusyContext = createContext<PortalBusyApi | null>(null);

/** Mindestanzeige für kurze Portal-Übergänge (Nav, Vorgang öffnen, Refresh). */
export const PORTAL_BUSY_MIN_MS = 320;

const DEFAULT_FLASH_MS = PORTAL_BUSY_MIN_MS;

/**
 * Busy-State sofort painten — vor `router.replace` / schwerem Detail-Mount.
 * In allen Portalen beim Vorgang-Klick nutzen.
 */
export function paintPortalBusyNow(
  ...setters: Array<(busy: boolean) => void>
): void {
  flushSync(() => {
    for (const set of setters) set(true);
  });
}

export function PortalBusyProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRef = useRef(0);
  const holdStartedAtRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hold = useCallback(() => {
    holdRef.current += 1;
    if (holdRef.current === 1) {
      holdStartedAtRef.current = Date.now();
    }
    clearTimer();
    flushSync(() => {
      setBusy(true);
    });
  }, [clearTimer]);

  const release = useCallback(
    (msMin = DEFAULT_FLASH_MS) => {
      if (holdRef.current <= 0) {
        clearTimer();
        setBusy(false);
        return;
      }
      if (holdRef.current > 1) {
        holdRef.current -= 1;
        return;
      }
      const elapsed = Date.now() - holdStartedAtRef.current;
      const wait = Math.max(0, msMin - elapsed);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        holdRef.current = 0;
        setBusy(false);
      }, wait);
    },
    [clearTimer]
  );

  const flash = useCallback(
    (ms = DEFAULT_FLASH_MS) => {
      // Während Hold nicht per Flash abschalten
      if (holdRef.current > 0) return;
      clearTimer();
      flushSync(() => {
        setBusy(true);
      });
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (holdRef.current === 0) setBusy(false);
      }, Math.max(120, ms));
    },
    [clearTimer]
  );

  const runBusy = useCallback(
    async <T,>(fn: () => Promise<T>, msMin = DEFAULT_FLASH_MS): Promise<T> => {
      hold();
      try {
        return await fn();
      } finally {
        release(msMin);
      }
    },
    [hold, release]
  );

  const api = useMemo(
    () => ({ busy, flash, hold, release, runBusy }),
    [busy, flash, hold, release, runBusy]
  );

  return (
    <PortalBusyContext.Provider value={api}>{children}</PortalBusyContext.Provider>
  );
}

const NOOP_API: PortalBusyApi = {
  busy: false,
  flash: () => undefined,
  hold: () => undefined,
  release: () => undefined,
  runBusy: async (fn) => fn(),
};

export function usePortalBusy(): PortalBusyApi {
  return useContext(PortalBusyContext) ?? NOOP_API;
}
