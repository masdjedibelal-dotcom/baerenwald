"use client";

/* SVG aus /public/icons — next/image bringt hier wenig */
/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";

interface BwIconProps {
  name: string;
  /** Feste Größe in px; weglassen = responsiv 28px / 32px */
  size?: number;
  className?: string;
}

export function BwIcon({
  name,
  size,
  className = "",
}: BwIconProps) {
  const src = `/icons/${name}.svg`;
  if (size != null) {
    return (
      <img
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden
        className={cn("block shrink-0", className)}
        style={{
          display: "block",
          width: size,
          height: size,
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn("block shrink-0", className)}
    />
  );
}
