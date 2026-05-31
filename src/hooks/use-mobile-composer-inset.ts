"use client";

import { useEffect, type RefObject } from "react";

const FOOTER_FALLBACK_PX = 92;
const MOBILE_MQ = "(max-width: 768px)";
const KEYBOARD_OPEN_THRESHOLD_PX = 48;

/**
 * Hält die Chat-Eingabezeile auf dem Handy über Tastatur und Funnel-Footer
 * (visualViewport + gemessene Footer-Höhe).
 */
export function useMobileComposerInset(
  rootRef: RefObject<HTMLElement | null>,
  opts?: { footerSelector?: string; enabled?: boolean }
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
    const footerEl = document.querySelector(
      opts?.footerSelector ?? ".funnel-footer"
    ) as HTMLElement | null;
    const vv = window.visualViewport;

    const clearVars = () => {
      el.style.removeProperty("--ki-vv-offset");
      el.style.removeProperty("--ki-footer-offset");
      el.style.removeProperty("--ki-composer-height");
    };

    const update = () => {
      if (!mq.matches) {
        clearVars();
        return;
      }

      const composer = el.querySelector(
        ".ki-rechner-chat-composer"
      ) as HTMLElement | null;
      const composerH = composer?.getBoundingClientRect().height ?? 64;
      el.style.setProperty("--ki-composer-height", `${Math.ceil(composerH)}px`);

      const footerH = footerEl?.getBoundingClientRect().height ?? FOOTER_FALLBACK_PX;
      let vvOffset = 0;
      if (vv) {
        vvOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      }
      const keyboardOpen = vvOffset > KEYBOARD_OPEN_THRESHOLD_PX;
      el.style.setProperty("--ki-vv-offset", `${Math.ceil(vvOffset)}px`);
      el.style.setProperty(
        "--ki-footer-offset",
        keyboardOpen ? "0px" : `${Math.ceil(footerH)}px`
      );
    };

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;

    const composer = el.querySelector(".ki-rechner-chat-composer");
    if (composer && ro) ro.observe(composer);
    if (footerEl && ro) ro.observe(footerEl);

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    mq.addEventListener("change", update);

      teardown = () => {
        ro?.disconnect();
        vv?.removeEventListener("resize", update);
        vv?.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        mq.removeEventListener("change", update);
        clearVars();
      };
    };

    attach();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [enabled, rootRef, opts?.footerSelector]);
}
