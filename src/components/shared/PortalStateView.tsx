"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MockIcon } from "@/components/shared/MockIcon";
import {
  PORTAL_OVERVIEW_HREF,
  PORTAL_SUPPORT_HREF,
  resolvePortalStateCopy,
  type PortalStateKind,
  type PortalStateRole,
} from "@/lib/portal2/portal-states";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
};

export type PortalStateViewProps = {
  kind: PortalStateKind;
  role?: PortalStateRole;
  createLabel?: string | null;
  canCreate?: boolean;
  /** Primär-Aktion überschreiben (sonst Default laut Mock) */
  onPrimary?: () => void;
  primaryHref?: string;
  onSecondary?: () => void;
  secondaryHref?: string;
  className?: string;
  /** Kompakter Listen-Eintrag statt Vollflächen-State */
  compact?: boolean;
  children?: ReactNode;
};

function StateButton({
  action,
  ghost,
}: {
  action: Action;
  ghost?: boolean;
}) {
  const className = cn(
    "inline-flex items-center justify-center rounded-[10px] px-5 py-[11px] text-[13.5px] font-semibold",
    ghost
      ? "border border-[var(--p2-line)] bg-white text-[var(--p2-sub)]"
      : "border-none bg-[var(--org-primary,var(--p2-primary))] text-white"
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className} onClick={action.onClick}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

/**
 * Globale Fehler-/Leer-Ansicht — Mock `screenState(kind)`.
 * `compact`: Listen-Empty wie Objekte/Filter — flacher Text, kein Icon-Kasten.
 */
export function PortalStateView({
  kind,
  role = "kunde",
  createLabel,
  canCreate,
  onPrimary,
  primaryHref,
  onSecondary,
  secondaryHref,
  className,
  compact = false,
  children,
}: PortalStateViewProps) {
  const copy = resolvePortalStateCopy(kind, { role, createLabel, canCreate });

  const primary: Action | null = copy.primaryLabel
    ? {
        label: copy.primaryLabel,
        onClick: onPrimary,
        href:
          primaryHref ??
          (copy.primaryLabel === "Zur Übersicht"
            ? PORTAL_OVERVIEW_HREF
            : copy.primaryLabel.startsWith("+")
              ? undefined
              : undefined),
      }
    : null;

  if (primary && kind === "e404" && !primaryHref && !onPrimary) {
    primary.href = PORTAL_OVERVIEW_HREF;
  }
  if (primary && kind === "zugriff" && !primaryHref && !onPrimary) {
    primary.href = PORTAL_OVERVIEW_HREF;
  }
  if (
    primary &&
    (kind === "server" || kind === "offline") &&
    !primaryHref &&
    !onPrimary
  ) {
    primary.onClick = () => {
      if (typeof window !== "undefined") window.location.reload();
    };
  }

  const secondary: Action | null = copy.secondaryLabel
    ? {
        label: copy.secondaryLabel,
        onClick: onSecondary,
        href:
          secondaryHref ??
          (copy.secondaryLabel === "Support kontaktieren"
            ? PORTAL_SUPPORT_HREF
            : undefined),
      }
    : null;

  if (compact) {
    return (
      <div
        className={cn(
          "portal-ui px-2 py-8 text-center",
          className
        )}
        data-portal-state={kind}
        role="status"
      >
        <p className="portal-text-body text-text-secondary">
          <span className="font-semibold text-text-primary">{copy.title}.</span>{" "}
          {copy.subtitle}
        </p>
        {(primary || secondary) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {primary ? <StateButton action={primary} /> : null}
            {secondary ? <StateButton action={secondary} ghost /> : null}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "portal-ui flex flex-1 flex-col items-center justify-center text-center",
        "min-h-[320px] px-6 py-14 sm:min-h-[520px] sm:px-10 sm:py-14",
        className
      )}
      data-portal-state={kind}
      role="status"
    >
      <div
        className="mb-5 grid h-[72px] w-[72px] place-items-center rounded-[20px] text-[32px]"
        style={{ background: copy.iconBg, color: copy.iconFg }}
        aria-hidden
      >
        <MockIcon glyph={copy.glyph} ctx="default" size={32} style={{ color: "inherit" }} />
      </div>
      <h2 className="mb-[9px] font-p2-head text-[20px] font-bold text-p2-ink sm:text-[23px]">
        {copy.title}
      </h2>
      <p className="mb-[22px] max-w-[360px] text-[13.5px] leading-relaxed text-p2-sub">
        {copy.subtitle}
      </p>
      {(primary || secondary) && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {primary ? <StateButton action={primary} /> : null}
          {secondary ? <StateButton action={secondary} ghost /> : null}
        </div>
      )}
      {children}
    </div>
  );
}

export function PortalEmptyState(
  props: Omit<PortalStateViewProps, "kind">
) {
  return <PortalStateView kind="leer" {...props} />;
}

export function PortalNotFoundState(
  props: Omit<PortalStateViewProps, "kind">
) {
  return <PortalStateView kind="e404" {...props} />;
}

export function PortalForbiddenState(
  props: Omit<PortalStateViewProps, "kind">
) {
  return <PortalStateView kind="zugriff" {...props} />;
}

export function PortalServerErrorState(
  props: Omit<PortalStateViewProps, "kind">
) {
  return <PortalStateView kind="server" {...props} />;
}

export function PortalOfflineState(
  props: Omit<PortalStateViewProps, "kind">
) {
  return <PortalStateView kind="offline" {...props} />;
}
