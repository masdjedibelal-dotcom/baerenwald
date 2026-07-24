"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { PORTAL_MODAL_SCRIM } from "@/lib/portal2/modal-shell";
import { cn } from "@/lib/utils";

/** Einheitliche Mobile-Sheet-Höhe (Kunden- + Partnerportal). */
export const PORTAL_MOBILE_SHEET_HEIGHT_CLASS =
  "h-[min(88dvh,720px)] max-h-[min(88dvh,720px)]";

type PortalMobileBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Barrierefreiheit — z. B. „Auftragsdetails“ */
  ariaLabel?: string;
  className?: string;
  /** z-index des Overlays (GPT nutzt 140). */
  zIndexClass?: string;
};

export function PortalMobileSheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
      <div className="w-11 shrink-0" aria-hidden />
      <div
        className="h-1.5 w-12 shrink-0 rounded-full bg-[var(--p2-line)]"
        aria-hidden
      />
      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--p2-line)] bg-[var(--p2-panel)] text-[var(--p2-sub)] transition-colors hover:bg-[var(--p2-hover)] hover:text-[var(--p2-ink)]"
        aria-label="Schließen"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

export function PortalMobileBottomSheet({
  open,
  onClose,
  children,
  ariaLabel = "Detail",
  className,
  zIndexClass = "z-[120]",
}: PortalMobileBottomSheetProps) {
  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 lg:hidden", zIndexClass, className)}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: PORTAL_MODAL_SCRIM }}
        onClick={onClose}
        aria-label="Schließen"
      />
      <article
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col border border-[var(--p2-line)] bg-[var(--p2-panel)] shadow-xl",
          "rounded-t-[var(--p2-radius-sheet,20px)]",
          PORTAL_MOBILE_SHEET_HEIGHT_CLASS
        )}
      >
        <PortalMobileSheetHeader onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </article>
    </div>
  );
}
