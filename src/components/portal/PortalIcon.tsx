"use client";

/* SVG-Assets aus /public/icons — next/image bringt hier wenig */
/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";

import { MockIcon, type MockIconProps } from "@/components/shared/MockIcon";
import type { MockIconCtx } from "@/lib/portal2/mock-icons";
import { cn } from "@/lib/utils";

export type PortalIconProps =
  | (MockIconProps & { asset?: undefined })
  | {
      asset: string;
      ctx?: MockIconCtx;
      size?: number | string;
      className?: string;
      title?: string;
      style?: CSSProperties;
      n?: undefined;
      glyph?: undefined;
      strokeWidth?: undefined;
      fill?: undefined;
    };

/**
 * Kanonische Portal-Icon-Komponente (P5-19).
 * — Mock/Tabler via `n`/`glyph` + `ctx`
 * — Public-SVG via `asset` (ersetzt BwIcon)
 */
export function PortalIcon(props: PortalIconProps) {
  if ("asset" in props && props.asset != null && props.asset !== "") {
    const { asset, className, size = "1em", ctx, style, title } = props;
    const dim = typeof size === "number" ? size : undefined;
    const sizeStyle: CSSProperties | undefined =
      typeof size === "string" ? { width: size, height: size } : undefined;
    const pxStyle =
      dim != null
        ? { width: dim, height: dim, display: "block" as const }
        : { display: "block" as const };
    return (
      <img
        src={`/icons/${asset}.svg`}
        width={dim}
        height={dim}
        alt=""
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
        aria-label={title}
        className={cn("portal-icon shrink-0", ctx ? `mock-icon--${ctx}` : null, className)}
        style={{ ...pxStyle, ...sizeStyle, ...style }}
        data-icon-ctx={ctx}
        data-icon-asset={asset}
      />
    );
  }

  const { asset: _a, ...rest } = props as MockIconProps & { asset?: string };
  return <MockIcon {...rest} />;
}
