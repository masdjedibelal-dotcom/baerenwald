"use client";

import { useEffect, useId, type ReactNode } from "react";

import {
  PORTAL_MODAL_DEFAULT_MAX_W,
  PORTAL_MODAL_SCRIM,
  PORTAL_MODAL_Z_INDEX,
} from "@/lib/portal2/modal-shell";
import { cn } from "@/lib/utils";

export type PortalModalShellProps = {
  open?: boolean;
  title: string;
  /** Mock `sub` — optional Unterzeile */
  subtitle?: string | null;
  children: ReactNode;
  onClose: () => void;
  /**
   * Mock `maxW` — Default 460.
   * Zahl = px; String = CSS-Wert (z. B. `min(560px, 100%)`).
   */
  maxWidth?: number | string;
  /** Backdrop-Klick schließt (Mock). Default true. */
  closeOnBackdrop?: boolean;
  className?: string;
  /** Zusätzlicher Inhalt im Header rechts neben × (selten). */
  headerExtra?: ReactNode;
};

/**
 * Mock `modalShell(title, sub, body, maxW)` — Basis aller Portal-Modals.
 * Mobil: bottom sheet (radius 20 20 0 0); Desktop: zentriert radius 16.
 */
export function PortalModalShell({
  open = true,
  title,
  subtitle,
  children,
  onClose,
  maxWidth = PORTAL_MODAL_DEFAULT_MAX_W,
  closeOnBackdrop = true,
  className,
  headerExtra,
}: PortalModalShellProps) {
  const titleId = useId();
  const subId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  return (
    <div
      className={cn("portal-modal-shell", className)}
      style={{
        zIndex: PORTAL_MODAL_Z_INDEX,
        background: PORTAL_MODAL_SCRIM,
      }}
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="portal-modal-shell-panel"
        style={{ maxWidth: maxW }}
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
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="portal-modal-shell-body">{children}</div>
      </div>
    </div>
  );
}
