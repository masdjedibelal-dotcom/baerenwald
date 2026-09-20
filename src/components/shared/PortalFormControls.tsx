/**
 * Portal-Formular-Primitives — Select / Checkbox / Date / Textarea.
 * Kanon neben PortalField (Label/Error-Wrapper).
 */
"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const PortalSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function PortalSelect({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn("portal-field", className)} {...props}>
      {children}
    </select>
  );
});

export const PortalCheckbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PortalCheckbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("portal-checkbox", className)}
      {...props}
    />
  );
});

export const PortalDate = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PortalDate({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="date"
      className={cn("portal-field", className)}
      {...props}
    />
  );
});

export const PortalTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function PortalTextarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn("portal-field", className)} {...props} />
  );
});

/** Text-Input (type text/email/tel/…) — kanon neben PortalField. */
export const PortalInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function PortalInput({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn("portal-field", className)}
      {...props}
    />
  );
});
