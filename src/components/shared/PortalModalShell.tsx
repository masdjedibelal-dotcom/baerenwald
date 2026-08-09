"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  lockPortalBodyScroll,
  unlockPortalBodyScroll,
} from "@/lib/portal2/lock-portal-body-scroll";
import {
  PORTAL_MODAL_SCRIM,
  PORTAL_MODAL_Z_INDEX,
  resolvePortalModalMaxWidth,
  resolvePortalModalVariant,
  type PortalModalSizeLegacy,
  type PortalModalVariant,
} from "@/lib/portal2/modal-shell";
import { cn } from "@/lib/utils";

/** Verschachtelte Modals (z. B. KI im Sheet) jeweils eine Schicht höher. */
const PortalModalDepthContext = createContext(0);

export type { PortalModalVariant };

const HISTORY_KEY = "portalModal";

export type PortalModalShellProps = {
  open?: boolean;
  title: string;
  /** Optional Unterzeile */
  subtitle?: string | null;
  children: ReactNode;
  onClose: () => void;
  /**
   * Surface-Variante (SoT PORTAL-SURFACE-OPTIMIERUNG):
   * - `edit` — mobil Sheet, Desktop Side-Over (Default)
   * - `confirm` — mobil kurzes Sheet, Desktop kompakt center
   * - `funnel` — Create/Wizard groß / mobil Fullscreen
   * - `preview` — Docs/QR: mobil Sheet, Desktop Side-Over breiter
   */
  variant?: PortalModalVariant;
  /**
   * @deprecated Nutze `variant`. `default`→edit, `funnel`→funnel.
   */
  size?: PortalModalSizeLegacy;
  /**
   * Max-Breite. Zahl = px; String = CSS-Wert.
   * Default hängt an `variant`.
   */
  maxWidth?: number | string;
  /** Backdrop-Klick schließt. Default true. */
  closeOnBackdrop?: boolean;
  /**
   * Unsaved changes — X / Backdrop / Escape / Browser-Back
   * öffnen Confirm „Änderungen verwerfen?“ statt sofort zu schließen.
   */
  dirty?: boolean;
  className?: string;
  /** Zusätzlicher Inhalt im Header rechts neben × (selten). */
  headerExtra?: ReactNode;
};

/**
 * Basis aller Portal-Overlays.
 * Mobil: Bottom Sheet (funnel = Fullscreen).
 * Desktop: edit/preview = Side-Over · confirm/funnel = Center.
 * S8/S10: Dirty-Confirm + History-Back fängt Overlay ab.
 */
export function PortalModalShell({
  open = true,
  title,
  subtitle,
  children,
  onClose,
  variant: variantProp,
  maxWidth: maxWidthProp,
  size = "default",
  closeOnBackdrop = true,
  dirty = false,
  className,
  headerExtra,
}: PortalModalShellProps) {
  const titleId = useId();
  const subId = useId();
  const discardTitleId = useId();
  const variant = resolvePortalModalVariant(variantProp, size);
  const resolvedMax = resolvePortalModalMaxWidth(variant, maxWidthProp);
  const maxW =
    typeof resolvedMax === "number" ? `${resolvedMax}px` : resolvedMax;
  const isFunnel = variant === "funnel";

  const [discardOpen, setDiscardOpen] = useState(false);
  const pushedRef = useRef(false);
  const skipPopRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const closeNow = useCallback(
    (fromPop: boolean) => {
      setDiscardOpen(false);
      if (!fromPop && pushedRef.current) {
        skipPopRef.current = true;
        pushedRef.current = false;
        window.history.back();
      } else {
        pushedRef.current = false;
      }
      onClose();
    },
    [onClose]
  );

  const attemptDismiss = useCallback(
    (fromPop = false) => {
      if (dirtyRef.current) {
        setDiscardOpen(true);
        // Back hat History schon verlassen — Overlay-Eintrag wiederherstellen
        if (fromPop) {
          pushedRef.current = true;
          window.history.pushState({ [HISTORY_KEY]: true }, "");
        }
        return;
      }
      closeNow(fromPop);
    },
    [closeNow]
  );

  // Body-Scroll-Lock (mobil): Hintergrund fixieren, Sheet darf scrollen
  useEffect(() => {
    if (!open) return;
    function onTouchMove(e: TouchEvent) {
      const t = e.target;
      if (!(t instanceof Element)) {
        e.preventDefault();
        return;
      }
      if (t.closest(".portal-modal-shell-body, .portal-modal-discard-panel")) {
        return;
      }
      e.preventDefault();
    }
    lockPortalBodyScroll();
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      unlockPortalBodyScroll();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (discardOpen) {
        setDiscardOpen(false);
        return;
      }
      attemptDismiss(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, discardOpen, attemptDismiss]);

  // History-Entry: Browser-/Android-Back schließt Overlay zuerst
  useEffect(() => {
    if (!open) {
      setDiscardOpen(false);
      if (pushedRef.current) {
        skipPopRef.current = true;
        pushedRef.current = false;
        window.history.back();
      }
      return;
    }

    pushedRef.current = true;
    window.history.pushState({ [HISTORY_KEY]: true }, "");

    function onPopState() {
      if (skipPopRef.current) {
        skipPopRef.current = false;
        return;
      }
      pushedRef.current = false;
      attemptDismiss(true);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [open, attemptDismiss]);

  const depth = useContext(PortalModalDepthContext);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const shell = (
    <PortalModalDepthContext.Provider value={depth + 1}>
      <div
        className={cn(
          "portal-ui portal-modal-shell",
          `portal-modal-shell--${variant}`,
          className
        )}
        style={{
          // Body-Portal + höhere Schicht bei Nesting (KI/GPT im Sheet nicht von Buttons abschneiden)
          zIndex: PORTAL_MODAL_Z_INDEX + depth * 10,
          background: PORTAL_MODAL_SCRIM,
        }}
        role="presentation"
        onClick={closeOnBackdrop ? () => attemptDismiss(false) : undefined}
      >
        <div
          className={cn(
            "portal-modal-shell-panel",
            `portal-modal-shell-panel--${variant}`
          )}
          style={
            {
              maxWidth: maxW,
              ["--portal-modal-max"]: maxW,
              ...(isFunnel ? { ["--portal-funnel-modal-max"]: maxW } : null),
            } as CSSProperties
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle?.trim() ? subId : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="portal-modal-shell-header">
            <div className="portal-modal-shell-heading">
              <h2 id={titleId} className="portal-modal-shell-title">
                {title}
              </h2>
              {subtitle?.trim() ? (
                <p id={subId} className="portal-modal-shell-sub">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headerExtra}
            <button
              type="button"
              className="portal-modal-shell-close"
              aria-label="Schließen"
              onClick={() => attemptDismiss(false)}
            >
              ×
            </button>
          </div>
          <div className="portal-modal-shell-body">{children}</div>
        </div>

        {discardOpen ? (
          <div
            className="portal-modal-discard"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={discardTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-discard-panel">
              <p id={discardTitleId} className="portal-modal-discard-title">
                Änderungen verwerfen?
              </p>
              <div className="portal-modal-discard-actions portal-action-row">
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--secondary"
                  onClick={() => setDiscardOpen(false)}
                >
                  Weiter bearbeiten
                </button>
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--danger"
                  onClick={() => closeNow(false)}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PortalModalDepthContext.Provider>
  );

  return createPortal(shell, document.body);
}
