/**
 * PortalField — required→Sternchen, error→Rahmen + Text, aria-invalid.
 * `portal-field`-Klasse nur auf native Controls — nicht auf Komposit-Kinder
 * (Foto-Slot, KI-Feld), sonst quetscht Modal-CSS sie auf 46px.
 */
"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

function isNativeFormControl(type: unknown): boolean {
  return type === "input" || type === "select" || type === "textarea";
}

export function PortalField({
  label,
  required,
  hint,
  error,
  children,
  className,
  name,
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  name?: string;
}) {
  const reactId = useId();
  const errorId = `${reactId}-err`;
  const kids = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<Record<string, unknown>>;
    const native = isNativeFormControl(el.type);
    return cloneElement(el, {
      "aria-invalid": error ? true : el.props["aria-invalid"],
      "aria-required": required ? true : el.props["aria-required"],
      "aria-describedby": error
        ? [el.props["aria-describedby"], errorId].filter(Boolean).join(" ")
        : el.props["aria-describedby"],
      className: cn(
        typeof el.props.className === "string" ? el.props.className : undefined,
        native && "portal-field",
        native && error && "portal-field--error"
      ),
    });
  });

  return (
    <div
      className={cn(
        "portal-field-wrap",
        error && "portal-field-wrap--error",
        className
      )}
      data-field={name || undefined}
    >
      {label ? (
        <label className="portal-field-label">
          {label}
          {required ? (
            <span className="portal-field-req" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {kids}
      {hint && !error ? <p className="portal-field-hint">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="portal-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
