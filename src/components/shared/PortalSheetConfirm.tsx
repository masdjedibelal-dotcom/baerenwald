"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PORTAL_MODAL_Z_INDEX } from "@/lib/portal2/modal-shell";
import { cn } from "@/lib/utils";

export type PortalSheetConfirmProps = {
  open: boolean;
  title: string;
  description?: string | null;
  /** Links / Secondary — Default „Weiter bearbeiten“ */
  cancelLabel?: string;
  /** Rechts / Primary — Default „Verwerfen“ */
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /**
   * `nested` = über bestehendem Sheet (Dirty-Confirm).
   * `standalone` = eigener Body-Portal-Overlay.
   */
  placement?: "nested" | "standalone";
  className?: string;
  children?: ReactNode;
};

/**
 * Einheitliches Bottom-Confirm (Verwerfen / Weiter bearbeiten).
 * Gleiches Pattern für Dirty-Close und alle Portal-Confirms.
 */
export function PortalSheetConfirm({
  open,
  title,
  description,
  cancelLabel = "Weiter bearbeiten",
  confirmLabel = "Verwerfen",
  confirmVariant = "danger",
  loading = false,
  onCancel,
  onConfirm,
  placement = "standalone",
  className,
  children,
}: PortalSheetConfirmProps) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || placement !== "standalone") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, placement, loading, onCancel]);

  if (!open) return null;
  if (placement === "standalone" && !mounted) return null;

  const panel = (
    <div
      className={cn(
        placement === "nested"
          ? "portal-modal-discard"
          : "portal-ui portal-sheet-confirm",
        className
      )}
      style={
        placement === "standalone"
          ? { zIndex: PORTAL_MODAL_Z_INDEX + 40 }
          : undefined
      }
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description?.trim() ? descId : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (placement === "standalone" && !loading) onCancel();
      }}
    >
      <div
        className="portal-modal-discard-panel relative"
        onClick={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="portal-modal-discard-title">
          {title}
        </p>
        {description?.trim() ? (
          <p id={descId} className="portal-sheet-confirm-desc">
            {description}
          </p>
        ) : null}
        {children}
        <div className="portal-modal-discard-actions portal-action-row">
          <button
            type="button"
            className="portal-action-btn portal-action-btn--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "portal-action-btn",
              confirmVariant === "danger"
                ? "portal-action-btn--danger"
                : "portal-action-btn--primary",
              loading && "opacity-60"
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Bitte warten…" : confirmLabel}
          </button>
        </div>
        {loading ? (
          <div
            className="portal-modal-shell-busy"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <PortalContentBusy
              title="Wird gespeichert…"
              body="Einen Moment bitte."
              className="!min-h-0 !py-6"
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (placement === "nested") return panel;
  return createPortal(panel, document.body);
}
