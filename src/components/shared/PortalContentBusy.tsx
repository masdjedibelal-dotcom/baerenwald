"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  body?: string;
  /** `page` = Route-Loading; `inline` = Content im Shell-Main */
  variant?: "page" | "inline";
  className?: string;
};

/**
 * Einheitlicher Ladezustand für Portal-Inhalte (Kunde / Partner / HV).
 */
export function PortalContentBusy({
  title = "Wird geladen…",
  body = "Einen Moment bitte.",
  variant = "inline",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "portal-content-busy flex flex-col items-center justify-center text-center",
        variant === "page"
          ? "min-h-[50vh] px-4 py-16"
          : "min-h-[40vh] w-full px-3 py-14",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-9 w-9 animate-spin text-[var(--org-primary,var(--color-accent,#2E7D52))]"
        strokeWidth={2}
        aria-hidden
      />
      <h2 className="mt-5 font-[family-name:var(--font-display,system-ui)] text-lg font-bold text-[var(--p2-ink,#16201b)]">
        {title}
      </h2>
      {body ? (
        <p className="mx-auto mt-2 max-w-[320px] text-sm leading-relaxed text-[var(--p2-sub,#404a45)]">
          {body}
        </p>
      ) : null}
    </div>
  );
}
