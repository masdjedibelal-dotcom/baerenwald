"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type PortalButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type PortalButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Farb-/Semantik-Variante — Pflicht (kein implizites primary für Pills). */
  variant: PortalButtonVariant;
  /** Kompakte Höhe (`portal-btn-compact` statt `portal-btn`). */
  compact?: boolean;
  /** Volle Breite (`portal-action-btn--block`). */
  block?: boolean;
  /**
   * Wenn false: nur Größen-Klasse (`portal-btn`), z. B. zusammen mit Legacy-Klassen.
   * Default true: Action-Semantik inkl. Varianten-Farben.
   */
  action?: boolean;
};

const VARIANT_CLASS: Record<PortalButtonVariant, string> = {
  primary: "portal-action-btn--primary",
  secondary: "portal-action-btn--secondary",
  ghost: "portal-action-btn--ghost",
  danger: "portal-action-btn--danger",
};

/**
 * Kanonischer Portal-Button (P6).
 * Additiv: `portal-btn` (Skalierung) + `portal-action-btn` (+ Variante).
 */
export const PortalButton = React.forwardRef<HTMLButtonElement, PortalButtonProps>(
  function PortalButton(
    {
      variant,
      compact = false,
      block = false,
      action = true,
      className,
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          compact ? "portal-btn-compact" : "portal-btn",
          action && "portal-action-btn",
          action && VARIANT_CLASS[variant],
          block && "portal-action-btn--block",
          className
        )}
        {...props}
      />
    );
  }
);

/** Alias für Action-CTAs — gleiche API wie `PortalButton`. */
export const ActionBtn = PortalButton;
