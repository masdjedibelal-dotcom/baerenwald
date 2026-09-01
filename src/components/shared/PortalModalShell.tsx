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
import { Check, X } from "lucide-react";

import {
  lockPortalBodyScroll,
  unlockPortalBodyScroll,
} from "@/lib/portal2/lock-portal-body-scroll";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { PortalSheetConfirm } from "@/components/shared/PortalSheetConfirm";
import {
  PORTAL_MODAL_SCRIM,
  PORTAL_MODAL_Z_INDEX,
  resolvePortalModalMaxWidth,
  resolvePortalModalVariant,
  type PortalModalSizeLegacy,
  type PortalModalVariant,
} from "@/lib/portal2/modal-shell";
import {
  portalToastDiscarded,
} from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

/** Verschachtelte Modals (z. B. KI im Sheet) jeweils eine Schicht höher. */
const PortalModalDepthContext = createContext(0);

/**
 * Escape nur für das oberste offene Overlay —
 * sonst schließen Parent-FAB und KI-Sheet gleichzeitig.
 */
const portalModalEscapeStack: Array<() => void> = [];

const HISTORY_KEY = "portalModal";

/**
 * Browser-Back / history: nur die oberste Card schließen
 * (Card-in-Card → zurück zur darunterliegenden, nicht alles zu).
 */
type PortalModalHistoryLayer = {
  id: symbol;
  onPop: () => void;
};

const portalModalHistoryStack: PortalModalHistoryLayer[] = [];
let portalModalHistoryListening = false;
let portalModalHistorySuppress = 0;

function ensurePortalModalHistoryListener() {
  if (portalModalHistoryListening) return;
  portalModalHistoryListening = true;
  window.addEventListener("popstate", () => {
    if (portalModalHistorySuppress > 0) {
      portalModalHistorySuppress -= 1;
      return;
    }
    const top = portalModalHistoryStack[portalModalHistoryStack.length - 1];
    if (!top) return;
    top.onPop();
  });
}

function pushPortalModalHistoryLayer(layer: PortalModalHistoryLayer) {
  ensurePortalModalHistoryListener();
  portalModalHistoryStack.push(layer);
  window.history.pushState({ [HISTORY_KEY]: true }, "");
}

function removePortalModalHistoryLayer(
  id: symbol,
  consumeHistoryEntry: boolean
) {
  const i = portalModalHistoryStack.findIndex((l) => l.id === id);
  if (i >= 0) portalModalHistoryStack.splice(i, 1);
  if (consumeHistoryEntry) {
    portalModalHistorySuppress += 1;
    window.history.back();
  }
}

export type { PortalModalVariant };

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
   * öffnen Confirm „Nicht gespeichert“ statt sofort zu schließen.
   */
  dirty?: boolean;
  className?: string;
  /** Zusätzlicher Inhalt im Header rechts (Titel links neben ×). */
  headerExtra?: ReactNode;
  /**
   * Primäraktion (Speichern / PDF / Hochladen).
   * Default: Footer-CTA. `confirmPlacement="header"` nur für Ausnahmen.
   * × = schließen ohne Speichern (bei dirty → Hinweis).
   */
  onConfirm?: () => void;
  /** Check/CTA deaktivieren (Validierung / Busy). */
  confirmDisabled?: boolean;
  /** Label für Confirm. Default „Speichern“. */
  confirmLabel?: string;
  /**
   * Wo die Confirm-Aktion liegt.
   * Default `footer` — sichtbarer CTA unten.
   */
  confirmPlacement?: "footer" | "header";
  /** Eigener Sticky-Footer (ersetzt Auto-Footer aus onConfirm). */
  footer?: ReactNode;
  /** Speichern / Upload — Overlay im Sheet (über dem Inhalt). */
  busy?: boolean;
  busyTitle?: string;
  busyBody?: string;
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
  onConfirm,
  confirmDisabled = false,
  confirmLabel = "Speichern",
  confirmPlacement = "footer",
  footer,
  busy = false,
  busyTitle = "Wird gespeichert…",
  busyBody = "Einen Moment bitte.",
}: PortalModalShellProps) {
  const titleId = useId();
  const subId = useId();
  const variant = resolvePortalModalVariant(variantProp, size);
  const resolvedMax = resolvePortalModalMaxWidth(variant, maxWidthProp);
  const maxW =
    typeof resolvedMax === "number" ? `${resolvedMax}px` : resolvedMax;
  const isFunnel = variant === "funnel";
  const isEdit = variant === "edit";
  const hasAutoConfirm = Boolean(onConfirm) && footer == null;
  /** Edit: Footer + Desktop-Check. header-Placement: Check Desktop, Footer Mobil. */
  const showHeaderConfirm =
    hasAutoConfirm && (confirmPlacement === "header" || isEdit);
  const showFooterConfirm =
    hasAutoConfirm &&
    (confirmPlacement === "footer" ||
      confirmPlacement === "header" ||
      isEdit);
  const footerMobileOnly =
    hasAutoConfirm && confirmPlacement === "header" && !isEdit;

  const [discardOpen, setDiscardOpen] = useState(false);
  const layerIdRef = useRef(Symbol("portal-modal"));
  const inHistoryStackRef = useRef(false);
  const busyHoldRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const depth = useContext(PortalModalDepthContext);
  const { hold, release } = usePortalBusy();

  /** Speichern/Upload im Sheet → gleiches Portal-Loading wie Nav/Refresh. */
  useEffect(() => {
    if (!open) {
      if (busyHoldRef.current) {
        busyHoldRef.current = false;
        release();
      }
      return;
    }
    if (busy) {
      if (!busyHoldRef.current) {
        busyHoldRef.current = true;
        hold();
      }
      return;
    }
    if (busyHoldRef.current) {
      busyHoldRef.current = false;
      release();
    }
  }, [open, busy, hold, release]);

  useEffect(() => {
    return () => {
      if (busyHoldRef.current) {
        busyHoldRef.current = false;
        release();
      }
    };
  }, [release]);

  const closeNow = useCallback(
    (fromPop: boolean) => {
      setDiscardOpen(false);
      if (inHistoryStackRef.current) {
        inHistoryStackRef.current = false;
        // fromPop: Eintrag schon durch Back konsumiert — nur Stack bereinigen.
        // UI-Close (X/Backdrop): History-Eintrag mitnehmen, ohne Parent zu triggern.
        removePortalModalHistoryLayer(layerIdRef.current, !fromPop);
      }
      onClose();
    },
    [onClose]
  );

  const attemptDismiss = useCallback(
    (fromPop = false) => {
      if (busy) return;
      if (dirtyRef.current) {
        setDiscardOpen(true);
        // Back hat History schon verlassen — Overlay-Eintrag wiederherstellen
        if (fromPop) {
          window.history.pushState({ [HISTORY_KEY]: true }, "");
        }
        return;
      }
      closeNow(fromPop);
    },
    [busy, closeNow]
  );

  const attemptDismissRef = useRef(attemptDismiss);
  attemptDismissRef.current = attemptDismiss;

  const resolvedFooter =
    footer ??
    (showFooterConfirm ? (
      <div className="portal-modal-shell-footer-actions">
        <button
          type="button"
          className="portal-action-btn portal-action-btn--secondary"
          disabled={busy}
          onClick={() => {
            if (busy) return;
            attemptDismissRef.current(false);
          }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          className="portal-action-btn portal-action-btn--primary"
          disabled={busy || confirmDisabled}
          onClick={() => {
            if (busy || confirmDisabled) return;
            onConfirm?.();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    ) : null);

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

  // Escape: nur oberstes Overlay (Stack), damit KI-Sheet nicht Parent mitschließt
  useEffect(() => {
    if (!open) return;
    const dismissTop = () => {
      if (discardOpen) {
        setDiscardOpen(false);
        return;
      }
      attemptDismissRef.current(false);
    };
    portalModalEscapeStack.push(dismissTop);
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const top = portalModalEscapeStack[portalModalEscapeStack.length - 1];
      if (top !== dismissTop) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      top();
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const i = portalModalEscapeStack.lastIndexOf(dismissTop);
      if (i >= 0) portalModalEscapeStack.splice(i, 1);
    };
  }, [open, discardOpen]);

  // History: jede offene Card eine Ebene — Back/X schließt nur die oberste
  useEffect(() => {
    if (!open) {
      setDiscardOpen(false);
      if (inHistoryStackRef.current) {
        inHistoryStackRef.current = false;
        removePortalModalHistoryLayer(layerIdRef.current, true);
      }
      return;
    }

    const id = layerIdRef.current;
    const layer: PortalModalHistoryLayer = {
      id,
      onPop: () => {
        const top = portalModalHistoryStack[portalModalHistoryStack.length - 1];
        if (top?.id !== id) return;
        attemptDismissRef.current(true);
      },
    };
    inHistoryStackRef.current = true;
    pushPortalModalHistoryLayer(layer);

    return () => {
      if (inHistoryStackRef.current) {
        inHistoryStackRef.current = false;
        removePortalModalHistoryLayer(id, true);
      }
    };
  }, [open]);

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
          depth > 0 && "portal-modal-shell--nested",
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
              /* Nur CSS-Var — mobil volle Breite; Desktop nutzt var in @media */
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
            <button
              type="button"
              className="portal-modal-shell-close"
              aria-label="Schließen"
              disabled={busy}
              onClick={() => attemptDismiss(false)}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
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
            {headerExtra || showHeaderConfirm ? (
              <div className="portal-modal-shell-header-extra">
                {headerExtra}
                {showHeaderConfirm ? (
                  <button
                    type="button"
                    className="portal-modal-shell-confirm"
                    aria-label={confirmLabel}
                    disabled={busy || confirmDisabled}
                    onClick={() => {
                      if (busy || confirmDisabled) return;
                      onConfirm?.();
                    }}
                  >
                    <Check strokeWidth={2.6} aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "portal-modal-shell-body relative",
              busy && "portal-modal-shell-body--busy"
            )}
          >
            {children}
            {busy ? (
              <div
                className="portal-modal-shell-busy"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="portal-modal-shell-busy-inner">
                  <span className="portal-modal-shell-spinner" aria-hidden />
                  <p className="portal-modal-shell-busy-title">{busyTitle}</p>
                  {busyBody ? (
                    <p className="portal-modal-shell-busy-body">{busyBody}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {resolvedFooter ? (
            <div
              className={cn(
                "portal-modal-shell-footer",
                footerMobileOnly && "portal-modal-shell-footer--mobile-only"
              )}
            >
              {resolvedFooter}
            </div>
          ) : null}
        </div>

        <PortalSheetConfirm
          open={discardOpen && !busy}
          placement="nested"
          title="Nicht gespeichert"
          description="Ihre Änderungen werden verworfen."
          cancelLabel="Weiter bearbeiten"
          confirmLabel="Verwerfen"
          confirmVariant="danger"
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => {
            portalToastDiscarded();
            closeNow(false);
          }}
        />
      </div>
    </PortalModalDepthContext.Provider>
  );

  return createPortal(shell, document.body);
}
