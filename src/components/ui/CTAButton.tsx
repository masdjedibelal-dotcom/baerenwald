import Link from "next/link";

import { cn } from "@/lib/utils";

export type CTAButtonVariant = "primary" | "outline" | "ghost";

export interface CTAButtonProps {
  label: string;
  href: string;
  variant?: CTAButtonVariant;
  className?: string;
}

const variantClass: Record<CTAButtonVariant, string> = {
  primary:
    "rounded-full bg-funnel-accent text-white hover:opacity-90",
  outline:
    "rounded-full border-2 border-funnel-accent text-funnel-accent hover:opacity-90",
  ghost: "rounded-full text-funnel-accent underline underline-offset-4 hover:opacity-90",
};

export function CTAButton({
  label,
  href,
  variant = "primary",
  className,
}: CTAButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition",
        variantClass[variant],
        className
      )}
    >
      {label}
    </Link>
  );
}
