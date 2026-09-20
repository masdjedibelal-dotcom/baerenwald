"use client";

import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

type Props = {
  /** Nur für Screenreader — sichtbar kein Text. */
  label?: string;
  className?: string;
};

/** Kleiner Spinner für nachgeladene Sektionen — Alias auf PortalContentBusy. */
export function PortalInlineLoading({
  label = "Wird geladen",
  className,
}: Props) {
  return (
    <PortalContentBusy variant="section" label={label} className={className} />
  );
}
