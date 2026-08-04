const GUIDED_INPUT_SELECTOR = ".gpt-guided-plz, .gpt-guided-lead-form";
const SCROLLER_SELECTOR = ".ki-rechner-chat-messages";
const PAGE_ROOT_SELECTOR = ".ki-rechner-chat-active, .portal-gpt-shell";

function guidedInputPageRoot(node: HTMLElement | null): HTMLElement | null {
  return node?.closest(PAGE_ROOT_SELECTOR) as HTMLElement | null;
}

/** Markiert Guided-Eingaben (PLZ, Lead) — Composer wird mobil ausgeblendet. */
export function setGuidedInputFocused(node: HTMLElement | null, focused: boolean): void {
  const root = guidedInputPageRoot(node);
  if (!root) return;
  root.classList.toggle("ki-guided-input-focused", focused);
}

export function handleGuidedInputFocus(node: HTMLElement | null): void {
  setGuidedInputFocused(node, true);
  scrollGuidedBlockIntoView(node);
}

export function handleGuidedInputBlur(node: HTMLElement | null): void {
  window.setTimeout(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest(GUIDED_INPUT_SELECTOR)) return;
    setGuidedInputFocused(node, false);
  }, 80);
}

/**
 * Scrollt Guided-Blöcke innerhalb der Nachrichtenliste — nicht das Fenster (iOS-Tastatur).
 * Block erscheint unten im sichtbaren Bereich, direkt über dem Composer.
 */
export function scrollGuidedBlockIntoView(node: HTMLElement | null): void {
  if (!node || typeof window === "undefined") return;

  const scroller = node.closest(SCROLLER_SELECTOR) as HTMLElement | null;

  const run = () => {
    if (!scroller) {
      node.scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    }

    const padding = 20;
    const nodeRect = node.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();

    if (nodeRect.bottom > scrollRect.bottom - padding) {
      scroller.scrollTop += nodeRect.bottom - scrollRect.bottom + padding;
    } else if (nodeRect.top < scrollRect.top + padding) {
      scroller.scrollTop -= scrollRect.top + padding - nodeRect.top;
    }
  };

  requestAnimationFrame(run);
  window.setTimeout(run, 100);
  window.setTimeout(run, 350);
}
