"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD_PX = 36;

type PortalMobileScrollChrome = {
  /** y > Schwelle — CTAs statt Bottom-Nav */
  scrolled: boolean;
  /** Inhalt ist lang genug, dass der Swap erreichbar ist */
  canScroll: boolean;
};

function scrollingRoot(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

function getScrollY(): number {
  return (
    scrollingRoot().scrollTop ||
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function getOverflowPx(): number {
  const root = scrollingRoot();
  return Math.max(root.scrollHeight, document.body.scrollHeight) - window.innerHeight;
}

/**
 * Mobil-Chrome für Portal-Details (Dokument-Scroll, analog CRM).
 * `scrolled` ab ~36px; `canScroll` nur wenn der Swap per Scroll erreichbar ist.
 */
export function usePortalMobileScrollChrome(
  enabled: boolean
): PortalMobileScrollChrome {
  const [scrolled, setScrolled] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setScrolled(false);
      setCanScroll(false);
      return;
    }

    const update = () => {
      ticking.current = false;
      const overflow = getOverflowPx();
      setCanScroll(overflow > SCROLL_THRESHOLD_PX + 12);
      setScrolled(getScrollY() > SCROLL_THRESHOLD_PX);
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("bw:scroll-chrome-sync", onScroll);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onScroll)
        : null;
    ro?.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("bw:scroll-chrome-sync", onScroll);
      ro?.disconnect();
    };
  }, [enabled]);

  return { scrolled, canScroll };
}
