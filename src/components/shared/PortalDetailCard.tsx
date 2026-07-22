"use client";

import { PORTAL_C } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Weiße Detail-Card im Portal-2.0-Stil (HV/HW Mock). */
export function PortalDetailCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn("rounded-xl bg-white p-4", className)}
      style={{ border: `1px solid ${PORTAL_C.line}` }}
    >
      {title ? (
        <h3
          className="mb-3 text-[14px] font-bold"
          style={{
            color: PORTAL_C.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
          }}
        >
          {title}
        </h3>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
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
      style={{ borderColor: PORTAL_C.line2 }}
    >
      <p
        className="text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ color: PORTAL_C.faint }}
      >
        {label}
      </p>
      <div
        className="mt-0.5 text-[13.5px] font-semibold"
        style={{ color: PORTAL_C.ink }}
      >
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
        "w-full rounded-[9px] px-4 py-3 text-[13.5px] font-semibold text-white disabled:opacity-50",
        className
      )}
      style={{ background: PORTAL_C.primary }}
    >
      {label}
    </button>
  );
}
