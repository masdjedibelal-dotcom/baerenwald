"use client";

import type { ReactNode } from "react";

import { PortalSectionAddButton } from "@/components/shared/PortalEinstellungenUi";
import {
  portalDetailSectionBorderStyle,
  portalDetailSectionClass,
  type PortalDetailChrome,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
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

/** Caption über Wert (Mock Einsatz-Card). */
export function PortalDetailMetaField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("border-b py-2.5 last:border-b-0", className)}
      style={{ borderColor: PORTAL_VAR.line2 }}
    >
      <p className="portal-text-label" style={{ color: PORTAL_VAR.faint }}>
        {label}
      </p>
      <div className="portal-text-meta mt-0.5 font-semibold" style={{ color: PORTAL_VAR.ink }}>
        {children}
      </div>
    </div>
  );
}

export function PortalDetailPrimaryButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "portal-action-btn portal-action-btn--primary portal-action-btn--block",
        className
      )}
    >
      {label}
    </button>
  );
}
