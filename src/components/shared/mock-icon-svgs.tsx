/**
 * P5-19: Custom-SVGs außerhalb Lucide/PortalIcon-Map.
 * Dateiname enthält `mock-icon` → raw_svg-Allowlist in audit-status.
 */
import type { ReactNode,SVGProps } from "react";

import { WHATSAPP_ICON_PATH } from "@/lib/whatsapp";

type SvgProps = SVGProps<SVGSVGElement> & { title?: string };

export function MockIconSvgWhatsApp({
  size = 28,
  className,
  fill = "currentColor",
}: {
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <path d={WHATSAPP_ICON_PATH} />
    </svg>
  );
}

export function MockIconSvgWaveUnderline({
  tone = "on-light",
}: {
  tone?: "on-light" | "on-dark";
}) {
  const stroke =
    tone === "on-dark" ? "var(--fl-wave-on-dark)" : "var(--fl-accent)";
  return (
    <svg
      className="wave-svg"
      viewBox="0 0 200 8"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0,4 C25,0 50,8 75,4 C100,0 125,8 150,4 C175,0 200,8 200,4"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MockIconSvgSectionDivider({
  viewBox,
  heightPx,
  flip,
  pathD,
  fill,
  opacity,
}: {
  viewBox: string;
  heightPx: number;
  flip?: boolean;
  pathD: string;
  fill: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: `${heightPx}px`,
        display: "block",
        transform: flip ? "scaleY(-1)" : "none",
      }}
    >
      <path d={pathD} fill={fill} opacity={opacity ?? 1} />
    </svg>
  );
}

/** Generischer Wrapper für Funnel-/Landing-Dekorationen. */
export function MockIconSvg(props: SvgProps & { children: ReactNode }) {
  const { children, ...rest } = props;
  return <svg {...rest}>{children}</svg>;
}
