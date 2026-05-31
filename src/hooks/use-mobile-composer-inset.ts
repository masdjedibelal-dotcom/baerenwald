"use client";

import { useEffect, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 768px)";
const KEYBOARD_OPEN_THRESHOLD_PX = 48;

/**
 * Mobil: Tastatur erkennen (visualViewport), Footer ausblenden, Seite markieren.
 */
export function useMobileComposerInset(
  rootRef: RefObject<HTMLElement | null>,
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled !== false;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    const attach = () => {
      if (cancelled) return;
      const el = rootRef.current;
      if (!el) {
        requestAnimationFrame(attach);
        return;
      }

      const mq = window.matchMedia(MOBILE_MQ);
      const pageEl = el.closest(".ki-rechner-chat-active") as HTMLElement | null;
      const vv = window.visualViewport;

      const clearState = () => {
        pageEl?.classList.remove("ki-keyboard-open");
        if (pageEl) {
          pageEl.style.removeProperty("--ki-vv-height");
        }
      };

      const update = () => {
        if (!mq.matches) {
          clearState();
          return;
        }

        let vvOffset = 0;
        if (vv) {
          vvOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
          pageEl?.style.setProperty("--ki-vv-height", `${Math.ceil(vv.height)}px`);
        }

        const keyboardOpen = vvOffset > KEYBOARD_OPEN_THRESHOLD_PX;
        pageEl?.classList.toggle("ki-keyboard-open", keyboardOpen);
      };

      update();
      vv?.addEventListener("resize", update);
      vv?.addEventListener("scroll", update);
      window.addEventListener("resize", update);
      mq.addEventListener("change", update);

      teardown = () => {
        vv?.removeEventListener("resize", update);
        vv?.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        mq.removeEventListener("change", update);
        clearState();
      };
    };

    attach();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [enabled, rootRef]);
}
