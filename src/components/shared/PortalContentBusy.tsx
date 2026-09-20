"use client";


import { PortalIcon } from "@/components/portal/PortalIcon";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  body?: string;
  /** `section` = kompakter Inline-Spinner (PortalInlineLoading). */
  label?: string;
  /** `page` = Route-Loading; `inline` = Content im Shell-Main; `section` = kompakt */
  variant?: "page" | "inline" | "section";
  className?: string;
};

/**
 * Einheitlicher Ladezustand für Portal-Inhalte (Kunde / Partner / HV).
 * P3-7 / P6-8: Seitenrahmen + Skeleton-Pulse; section = Inline-Spinner.
 */
export function PortalContentBusy({
  title = "Wird geladen…",
  body = "Einen Moment bitte.",
  label,
  variant = "inline",
  className,
}: Props) {
  if (variant === "section") {
    return (
      <div
        className={cn("portal-inline-loading", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="portal-inline-loading-spinner" aria-hidden />
        <span className="sr-only">{label ?? title ?? "Wird geladen"}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "portal-content-busy flex w-full flex-col",
        variant === "page" ? "min-h-[50vh] px-4 py-10" : "min-h-[40vh] px-3 py-8",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center gap-3">
          <PortalIcon n="loader" ctx="default" className="h-6 w-6 shrink-0 animate-spin text-[var(--org-primary,var(--color-accent))]" aria-hidden />
          <div className="min-w-0 text-left">
            <h2 className="portal-text-title">{title}</h2>
            {body ? (
              <p className="portal-text-body mt-0.5 text-[var(--p2-sub)]">{body}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-2 space-y-2" aria-hidden>
          <div className="h-3 w-2/3 animate-pulse rounded-card bg-[var(--p2-border)]" />
          <div className="h-3 w-full animate-pulse rounded-card bg-[var(--p2-border)]" />
          <div className="h-3 w-5/6 animate-pulse rounded-card bg-[var(--p2-border)]" />
          <div className="mt-3 h-16 w-full animate-pulse rounded-card bg-[var(--p2-border)]" />
        </div>
      </div>
    </div>
  );
}
