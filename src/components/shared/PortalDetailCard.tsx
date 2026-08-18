"use client";

import type { ReactNode } from "react";

import {
  portalDetailSectionBorderStyle,
  portalDetailSectionClass,
  type PortalDetailChrome,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/** Weiße Detail-Card — C1: `responsive` = Border mobil, flach ab lg. */
export function PortalDetailCard({
  title,
  children,
  className,
  bodyClassName,
  chrome = "responsive",
  id,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  chrome?: PortalDetailChrome;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(portalDetailSectionClass(chrome), className)}
      style={portalDetailSectionBorderStyle(chrome)}
    >
      {title ? (
        <h3 className="portal-text-section mb-3">{title}</h3>
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
