"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Optional Badge rechts vom Titel (Rolle, Status …). */
  badge?: ReactNode;
  /** Meta-Zeilen unter dem Titel — nur befüllte Inhalte übergeben. */
  meta?: ReactNode;
  /** Rechts: typisch PortalActionMenu (⋮). */
  menu?: ReactNode;
  /** Ganzer Eintrag klickbar (z. B. Einheit öffnen). */
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
};

/**
 * Scan-Card für Entity-Listen (Einheiten, Kontakte, Prüfpflichten, HM …):
 * Titel (+ Badge) · Meta · ⋮ — ohne Key-Value-Dash-Zeilen.
 */
export function PortalEntityCard({
  title,
  badge,
  meta,
  menu,
  onClick,
  className,
  children,
}: Props) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14.5px] font-semibold text-text-primary">
            {title}
          </p>
          {badge}
        </div>
        {meta ? <div className="mt-1 min-w-0">{meta}</div> : null}
        {children}
      </div>
      {menu ? (
        <div
          className="flex shrink-0 items-start pt-0.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border border-border-default bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
          className
        )}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[14.5px] font-semibold text-text-primary">
                {title}
              </p>
              {badge}
            </div>
            {meta ? <div className="mt-1 min-w-0">{meta}</div> : null}
            {children}
          </div>
        </button>
        {menu ? (
          <div
            className="flex shrink-0 items-start pt-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {menu}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <article
      className={cn(
        "flex items-start gap-2 rounded-xl border border-border-default bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        className
      )}
    >
      {body}
    </article>
  );
}
