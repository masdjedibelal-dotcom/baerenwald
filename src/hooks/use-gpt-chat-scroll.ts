"use client";

import { useCallback, useEffect, type RefObject } from "react";

import { KI_TEXTAREA_MAX_LINES } from "@/lib/ki-rechner/guards";

const TEXTAREA_MIN_HEIGHT_PX = 40;
const KEYBOARD_OPEN_THRESHOLD_PX = 48;

type UseGptChatScrollOptions = {
  chatRootRef: RefObject<HTMLElement | null>;
  messagesScrollRef: RefObject<HTMLElement | null>;
  composerRef: RefObject<HTMLElement | null>;
  messagesEndRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Nachrichten, Loading, Fehler, Brief-Leiste … */
  scrollTriggers: unknown[];
};

export function useGptChatScroll({
  chatRootRef,
  messagesScrollRef,
  composerRef,
  messagesEndRef,
  textareaRef,
  scrollTriggers,
}: UseGptChatScrollOptions) {
  const scrollChatToEnd = useCallback((smooth = false) => {
    const run = () => {
      const scroller = messagesScrollRef.current;
      if (scroller) {
        scroller.scrollTo({
          top: scroller.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    };
    requestAnimationFrame(run);
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [messagesScrollRef, messagesEndRef]);

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
    ta.scrollTop = ta.scrollHeight;
    scrollChatToEnd(false);
  }, [textareaRef, scrollChatToEnd]);

  const handleInputFocus = useCallback(() => {
    chatRootRef.current?.closest(".ki-rechner-chat-active")?.classList.add("ki-input-focused");
    scrollChatToEnd(false);
    window.setTimeout(() => scrollChatToEnd(false), 120);
    window.setTimeout(() => scrollChatToEnd(false), 320);
  }, [chatRootRef, scrollChatToEnd]);

  const handleInputBlur = useCallback(() => {
    window.setTimeout(() => {
      const vv = window.visualViewport;
      const vvOffset = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      if (vvOffset < KEYBOARD_OPEN_THRESHOLD_PX) {
        chatRootRef.current
          ?.closest(".ki-rechner-chat-active")
          ?.classList.remove("ki-input-focused");
      }
    }, 80);
  }, [chatRootRef]);

  useEffect(() => {
    scrollChatToEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollTriggers bewusst als Blob
  }, scrollTriggers);

  useEffect(() => {
    const composer = composerRef.current;
    const scroller = messagesScrollRef.current;
    if (!composer && !scroller) return;

    const ro = new ResizeObserver(() => {
      scrollChatToEnd(false);
    });
    if (composer) ro.observe(composer);
    if (scroller) ro.observe(scroller);
    return () => ro.disconnect();
  }, [composerRef, messagesScrollRef, scrollChatToEnd]);

  return {
    scrollChatToEnd,
    syncTextareaHeight,
    handleInputFocus,
    handleInputBlur,
  };
}
