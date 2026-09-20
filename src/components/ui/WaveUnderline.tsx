import type { ReactNode } from "react";

import { MockIconSvgWaveUnderline } from "@/components/shared/mock-icon-svgs";

type WaveTone = "on-light" | "on-dark";

/**
 * Dekorative Wellenlinie unter Hero-Headlines.
 * Bleibt als Inline-SVG (nicht SiteIcon), weil Stroke-Farbe tonabhängig ist.
 */
export function WaveUnderline({
  children,
  className = "",
  tone = "on-light",
}: {
  children: ReactNode;
  className?: string;
  tone?: WaveTone;
}) {
  return (
    <span className={`wave-wrap ${className}`.trim()}>
      {children}
      <MockIconSvgWaveUnderline tone={tone} />
    </span>
  );
}
