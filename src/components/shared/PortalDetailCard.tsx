"use client";

import type { ReactNode } from "react";

import { PortalSectionAddButton } from "@/components/shared/PortalEinstellungenUi";
import {
  portalDetailSectionBorderStyle,
  portalDetailSectionClass,
  type PortalDetailChrome,
} from "@/lib/portal2/layout-chrome";
import { cn } from "@/lib/utils";

/** Weiße Detail-Card — `responsive` / `card` = immer Section-Card; `flat` = ohne Rahmen. */
export function PortalDetailCard({
  title,
  children,
  className,
  bodyClassName,
  chrome = "responsive",
  id,
  headerAction,
  onAdd,
  addLabel = "Hinzufügen",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  chrome?: PortalDetailChrome;
  id?: string;
  /** Beliebige Aktion rechts vom Titel (z. B. Menü). */
  headerAction?: ReactNode;
  /** Accent-Plus rechts vom Titel — Section-Hinzufügen. */
  onAdd?: () => void;
  addLabel?: string;
}) {
  const trailing =
    headerAction || onAdd ? (
      <div className="flex shrink-0 items-center gap-1.5">
        {headerAction}
        {onAdd ? (
          <PortalSectionAddButton onClick={onAdd} label={addLabel} />
        ) : null}
      </div>
    ) : null;

  return (
    <section
      id={id}
      className={cn(portalDetailSectionClass(chrome), className)}
      style={portalDetailSectionBorderStyle(chrome)}
    >
      {title || trailing ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          {title ? (
            <h3 className="portal-text-section min-w-0">{title}</h3>
          ) : (
            <span />
          )}
          {trailing}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
