import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CTAButtonVariant = "primary" | "outline" | "ghost";

/**
 * Landing-/Marketing-Töne → bestehende CSS-Klassen (baerenwald-landing / gpt / conversion).
 * `bare` + `tone` hält das visuelle Design, die API ist eine Komponente.
 */
export type CTAButtonTone =
  | "default"
  | "hero"
  | "hero-page"
  | "hero-secondary"
  | "final"
  | "final-ghost"
  | "conversion"
  | "conversion-secondary"
  | "conversion-sticky"
  | "card"
  | "card-link"
  | "viz"
  | "viz-outline"
  | "guided";

const toneClass: Record<CTAButtonTone, string> = {
  default: "",
  hero: "btn-hero-action",
  "hero-page": "page-hero-btn-main",
  "hero-secondary": "page-hero-btn-secondary",
  final: "final-cta-action-primary",
  "final-ghost": "final-cta-action-ghost",
  conversion: "conversion-btn-main",
  "conversion-secondary": "conversion-btn-secondary",
  "conversion-sticky": "conversion-sticky-cta",
  card: "komplex-card-cta",
  "card-link": "leistung-card-cta-link",
  viz: "gpt-viz-btn gpt-viz-btn--primary",
  "viz-outline": "gpt-viz-btn gpt-viz-btn--outline",
  guided: "gpt-guided-primary-btn",
};

const variantClass: Record<CTAButtonVariant, string> = {
  primary: "rounded-pill bg-funnel-accent text-white hover:opacity-90",
  outline:
    "rounded-pill border-2 border-funnel-accent text-funnel-accent hover:opacity-90",
  ghost: "rounded-pill text-funnel-accent underline underline-offset-4 hover:opacity-90",
};

type Common = {
  label?: string;
  children?: ReactNode;
  variant?: CTAButtonVariant;
  /** Landing-CSS-Ton; setzt Klassen (mit `bare` typisch). */
  tone?: CTAButtonTone;
  className?: string;
  /**
   * Nur Größen-/Layout-/Ton-Klassen — für Landing-CSS
   * (`.btn-hero-action`, `.final-cta-action-primary`, …).
   */
  bare?: boolean;
};

export type CTAButtonAsLink = Common & {
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  type?: never;
  disabled?: never;
};

export type CTAButtonAsButton = Common & {
  href?: undefined;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export type CTAButtonProps = CTAButtonAsLink | CTAButtonAsButton;

function content(label?: string, children?: ReactNode) {
  return children ?? label ?? null;
}

/**
 * Kanonischer Website-CTA (Link oder Button).
 * Alle Marketing-/Funnel-/Viz-/Conversion-Primäraktionen darüber.
 */
export function CTAButton(props: CTAButtonProps) {
  const {
    label,
    children,
    variant = "primary",
    tone = "default",
    className,
    bare = false,
  } = props;

  const classes = cn(
    !bare && "inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition",
    !bare && variantClass[variant],
    tone !== "default" && toneClass[tone],
    className
  );

  const body = content(label, children);

  if ("href" in props && props.href != null) {
    return (
      <Link href={props.href} onClick={props.onClick} className={classes}>
        {body}
      </Link>
    );
  }

  const btn = props as CTAButtonAsButton;
  return (
    <button
      type={btn.type ?? "button"}
      disabled={btn.disabled}
      onClick={btn.onClick}
      className={classes}
    >
      {body}
    </button>
  );
}
