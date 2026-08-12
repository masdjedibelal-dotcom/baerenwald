"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string | null;
  /** Weitere Infos unter der Beschreibung (Datum, Meta, Status …). */
  meta?: ReactNode;
  actions?: ReactNode;
  error?: string | null;
  className?: string;
  children?: ReactNode;
};

/**
 * Einheitliche Dokument-/Unterlagen-Karte in Portalen:
 * links Titel → Beschreibung → Infos, rechts Aktionen.
 */
export function PortalDokumentCard({
  title,
  description,
  meta,
  actions,
  error,
  className,
  children,
}: Props) {
  return (
    <article
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border-default bg-white px-3.5 py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold leading-snug text-text-primary">
          {title}
        </h3>
        {description?.trim() ? (
          <p className="portal-text-meta mt-1 line-clamp-3 text-text-secondary">
            {description.trim()}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {meta}
          </div>
        ) : null}
        {children}
        {error ? (
          <p className="portal-text-meta mt-2 text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-start gap-1 pt-0.5">{actions}</div>
      ) : null}
    </article>
  );
}
