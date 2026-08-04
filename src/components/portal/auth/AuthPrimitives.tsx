"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/** Mock `aLabel` */
export function AuthLabel({ children }: { children: ReactNode }) {
  return (
    <div className="portal-auth-label mb-1.5 text-xs font-semibold text-text-secondary">
      {children}
    </div>
  );
}

/** Mock `aInput` */
export function AuthInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "portal-auth-input w-full rounded-[10px] border border-border-default bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-accent",
        className
      )}
    />
  );
}

/** Mock `aBtn` */
export function AuthBtn({
  ghost,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { ghost?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "portal-auth-btn w-full rounded-[10px] px-3.5 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
        ghost
          ? "border border-border-default bg-white text-text-primary hover:bg-muted/40"
          : "border-none bg-accent text-white hover:opacity-95",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Mock `aLink` */
export function AuthLink({
  children,
  onClick,
  href,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = cn(
    "portal-auth-link cursor-pointer font-semibold text-accent hover:underline",
    className
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
