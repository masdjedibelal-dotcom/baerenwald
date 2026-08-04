"use client";

import type { CSSProperties } from "react";

import {
  isMockIconCtx,
  isMockIconName,
  isPortalGlyph,
  resolveMockIcon,
  resolvePortalGlyph,
  type MockIconCtx,
  type MockIconName,
} from "@/lib/portal2/mock-icons";
import { cn } from "@/lib/utils";

export type MockIconProps = {
  /** Tabler-/Mock-Icon-Name (`n="layout-dashboard"`). */
  n?: MockIconName | string;
  /** Portal-Mock-Glyph (◈ ▤ ▦ …) — Alternative zu `n`. */
  glyph?: string;
  /**
   * Pflicht-Kontext → `--icon-*` Token (CRM-Lösung).
   * Ohne ctx: TypeScript-Fehler + Dev-Throw (Build-Guard 1).
   */
  ctx: MockIconCtx;
  /** Default `1em`; Zahl = px. */
  size?: number | string;
  className?: string;
  /** Stroke-Rendering (Lucide Default 2). */
  strokeWidth?: number;
  fill?: string;
  title?: string;
  style?: CSSProperties;
};

/**
 * Zentrale Icon-Darstellung: Mock→lucide, Stroke, Farb-Token via `ctx`.
 * Unbekannte Namen → Fehler (Dev) / null (Prod) — kein Platzhalter.
 */
export function MockIcon({
  n,
  glyph,
  ctx,
  size = "1em",
  className,
  strokeWidth = 2,
  fill,
  title,
  style,
}: MockIconProps) {
  if (!isMockIconCtx(ctx)) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`MockIcon: ungültiger ctx "${String(ctx)}"`);
    }
    return null;
  }

  let Icon;
  try {
    if (glyph != null && glyph !== "") {
      Icon = resolvePortalGlyph(glyph);
    } else if (n != null && n !== "") {
      if (!isMockIconName(n)) {
        if (process.env.NODE_ENV !== "production") {
          throw new Error(`Unbekanntes Mock-Icon: "${n}"`);
        }
        return null;
      }
      Icon = resolveMockIcon(n);
    } else {
      if (process.env.NODE_ENV !== "production") {
        throw new Error("MockIcon: `n` oder `glyph` erforderlich");
      }
      return null;
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") throw e;
    return null;
  }

  const dim = typeof size === "number" ? size : undefined;
  const sizeStyle: CSSProperties | undefined =
    typeof size === "string" ? { width: size, height: size } : undefined;

  const filled = fill ?? (n === "star-filled" || glyph === "⭐" ? "currentColor" : undefined);

  return (
    <Icon
      className={cn("mock-icon shrink-0", `mock-icon--${ctx}`, className)}
      size={dim}
      style={{ ...sizeStyle, ...style }}
      strokeWidth={strokeWidth}
      stroke="currentColor"
      fill={filled ?? "none"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      data-icon-ctx={ctx}
      data-icon-n={n ?? (glyph && isPortalGlyph(glyph) ? glyph : undefined)}
    />
  );
}

export function mockMenuIcon(n: MockIconName, ctx: MockIconCtx = "row", size = 15) {
  return <MockIcon n={n} ctx={ctx} size={size} />;
}
