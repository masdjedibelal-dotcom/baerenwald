"use client";

import { useEffect, useState } from "react";

import { PORTAL_MQ_MOBILE } from "@/lib/portal2/breakpoints";

/**
 * true = App-Chrome (< 1024px). SSR/erstes Paint: false (Desktop-first),
 * dann Match — vermeidet Hydration-Mismatch bei Bottom-Nav.
 */
export function useIsPortalMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PORTAL_MQ_MOBILE);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mobile;
}
