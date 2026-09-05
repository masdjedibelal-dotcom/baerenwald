"use client";

import { cn } from "@/lib/utils";

type Props = {
  /** Nur für Screenreader — sichtbar kein Text. */
  label?: string;
  className?: string;
};

/** Kleiner Spinner für nachgeladene Sektionen (kein Vollbild-Overlay). */
export function PortalInlineLoading({
  label = "Wird geladen",
  className,
}: Props) {
  return (
    <div
      className={cn("portal-inline-loading", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="portal-inline-loading-spinner" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
