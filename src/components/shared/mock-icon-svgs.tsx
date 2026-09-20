/**
 * P5-19: Custom-SVGs außerhalb Lucide/PortalIcon-Map.
 * Dateiname enthält `mock-icon` → raw_svg-Allowlist in audit-status.
 */
import type { CSSProperties, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";
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

const IG_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";

const GOOGLE_PATHS = [
  "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
  "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
  "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
  "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
] as const;

export function MockIconSvgInstagram({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d={IG_PATH} />
    </svg>
  );
}

export function MockIconSvgGoogle({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {GOOGLE_PATHS.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Mobile-FAB: Clipboard mit Plus. */
export function MockIconSvgCreateFab({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden
    >
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 10v6M9 13h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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

export function mockIconSvgStyle(style: CSSProperties): CSSProperties {
  return style;
}
