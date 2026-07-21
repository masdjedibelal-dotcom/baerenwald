"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { PortalBrandRoot } from "@/components/shared/PortalBrandRoot";
import {
  formatMieterWlFooterContact,
  mieterWlFooterNoreply,
  mieterWlLogoLetter,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import { cn } from "@/lib/utils";

import "./melden.css";

export type MieterWlFrameProps = {
  brand: MieterWlBrand;
  children: ReactNode;
  /** Ohne äußeren Desktop-Padding (z. B. Fehler mittig) */
  compact?: boolean;
  className?: string;
  /** Footer ausblenden */
  hideFooter?: boolean;
  /**
   * Flaches Funnel-Layout wie /rechner (kein Desktop-Kartenrahmen).
   * Standard für MeldeFormular.
   */
  variant?: "default" | "funnel";
};

/**
 * HV-Branding-Shell für Mieter-Melde (Header + optional Footer).
 * Sprache nur Deutsch — kein Sprachtoggle.
 */
export function MieterWlFrame({
  brand,
  children,
  compact,
  className,
  hideFooter,
  variant = "default",
}: MieterWlFrameProps) {
  return (
    <PortalBrandRoot
      className={cn(
        "mieter-wl-page",
        variant === "funnel" && "mieter-wl-page--funnel",
        className
      )}
      primary={brand.primary}
      primaryDk={brand.primaryDk}
      soft={brand.soft}
    >
      <div className={cn("mieter-wl-shell", compact && "mieter-wl-shell--compact")}>
        <MieterWlHeader brand={brand} />
        <div className="mieter-wl-body">{children}</div>
        {!hideFooter ? <MieterWlFooter brand={brand} /> : null}
      </div>
    </PortalBrandRoot>
  );
}

export function MieterWlHeader({ brand }: { brand: MieterWlBrand }) {
  const letter = mieterWlLogoLetter(brand);
  const sub = brand.sub?.trim() || "Hausverwaltung";

  return (
    <header className="mieter-wl-header">
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="mieter-wl-logo-img"
        />
      ) : (
        <div className="mieter-wl-logo-mark" aria-hidden>
          {letter}
        </div>
      )}
      <div className="mieter-wl-header-text">
        <p className="mieter-wl-org-name">{brand.name}</p>
        <p className="mieter-wl-org-sub">{sub}</p>
      </div>
    </header>
  );
}

export function MieterWlFooter({ brand }: { brand: MieterWlBrand }) {
  return (
    <footer className="mieter-wl-footer">
      <p>{formatMieterWlFooterContact(brand, "de")}</p>
      <p className="mieter-wl-footer-noreply">{mieterWlFooterNoreply("de")}</p>
    </footer>
  );
}

/** @deprecated Card-Wrapper erzeugt den iframe-Look — nicht im Funnel nutzen. */
export function MieterWlCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mieter-wl-card", className)}>{children}</div>;
}

/** Mock `wlBtn` */
export function MieterWlBtn({
  children,
  onClick,
  kind = "primary",
  disabled,
  type = "button",
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  href?: string;
}) {
  const className = cn(
    "mieter-wl-btn",
    kind === "ghost" ? "mieter-wl-btn--ghost" : "mieter-wl-btn--primary"
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
