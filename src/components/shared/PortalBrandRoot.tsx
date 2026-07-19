"use client";

import type { CSSProperties, ReactNode } from "react";

import { applyBrandStyle } from "@/lib/portal2/apply-brand";
import { cn } from "@/lib/utils";

type Props = {
  primary?: string | null;
  primaryDk?: string | null;
  soft?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: "div" | "main" | "section";
};

/**
 * WL-Root: setzt Mock-`applyBrand`-CSS-Variablen auf dem Container.
 */
export function PortalBrandRoot({
  primary,
  primaryDk,
  soft,
  className,
  style,
  children,
  as: Tag = "div",
}: Props) {
  const brandStyle = applyBrandStyle({ primary, primaryDk, soft });
  return (
    <Tag
      className={cn("portal-ui", className)}
      style={{ ...brandStyle, ...style }}
      data-portal-brand=""
    >
      {children}
    </Tag>
  );
}
