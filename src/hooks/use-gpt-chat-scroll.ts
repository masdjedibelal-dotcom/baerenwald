"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import { KI_TEXTAREA_MAX_LINES } from "@/lib/ki-rechner/guards";

const TEXTAREA_MIN_HEIGHT_PX = 40;
const KEYBOARD_OPEN_THRESHOLD_PX = 48;
/** Nur auto-scrollen wenn Nutzer schon unten war (wie WhatsApp/ChatGPT). */
const NEAR_BOTTOM_PX = 120;

type UseGptChatScrollOptions = {
  chatRootRef: RefObject<HTMLElement | null>;
  messagesScrollRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Nachrichten, Loading, Fehler, Brief-Leiste … */
  scrollTriggers: unknown[];
};

export function useGptChatScroll({
  chatRootRef,
  messagesScrollRef,
  textareaRef,
  scrollTriggers,
}: UseGptChatScrollOptions) {
  const isTypingRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return true;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    return distance <= NEAR_BOTTOM_PX;
  }, [messagesScrollRef]);

  const scrollChatToEnd = useCallback((force = false) => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    if (!force && isTypingRef.current) return;
    if (!force && !isNearBottom()) return;

    const jump = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };

    jump();
    requestAnimationFrame(jump);
  }, [messagesScrollRef, isNearBottom]);

  const syncTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const styles = getComputedStyle(ta);
    const lineHeight = parseFloat(styles.lineHeight) || 22;
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * KI_TEXTAREA_MAX_LINES + padY;
    const next = Math.max(TEXTAREA_MIN_HEIGHT_PX, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
    /* Nur innerhalb der Textarea scrollen — Nachrichtenliste nicht anfassen. */
    ta.scrollTop = ta.scrollHeight;
  }, [textareaRef]);

  const chatPageRoot = useCallback(() => {
    return chatRootRef.current?.closest(
      ".ki-rechner-chat-active, .portal-gpt-shell"
    ) as HTMLElement | null;
  }, [chatRootRef]);

  const handleInputFocus = useCallback(() => {
    isTypingRef.current = true;
    chatPageRoot()?.classList.add("ki-input-focused");
    scrollChatToEnd(true);
  }, [chatPageRoot, scrollChatToEnd]);

  const handleInputBlur = useCallback(() => {
    window.setTimeout(() => {
      isTypingRef.current = false;
      const vv = window.visualViewport;
      const vvOffset = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      if (vvOffset < KEYBOARD_OPEN_THRESHOLD_PX) {
        chatPageRoot()?.classList.remove("ki-input-focused");
      }
    }, 80);
  }, [chatPageRoot]);

  /** Neue Nachricht / Loading / Fehler → immer ans Ende. */
  useEffect(() => {
    scrollChatToEnd(true);
    const t1 = window.setTimeout(() => scrollChatToEnd(true), 80);
    const t2 = window.setTimeout(() => scrollChatToEnd(true), 250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollTriggers bewusst als Blob
  }, scrollTriggers);

  /** Inhalt wächst (lange GPT-Antwort) — nur scrollen wenn Nutzer nicht tippt und unten war. */
  useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;

    const ro = new ResizeObserver(() => {
      scrollChatToEnd(false);
    });
    ro.observe(scroller);

    return () => ro.disconnect();
  }, [messagesScrollRef, scrollChatToEnd]);

  return {
    scrollChatToEnd,
    syncTextareaHeight,
    handleInputFocus,
    handleInputBlur,
  };
}
