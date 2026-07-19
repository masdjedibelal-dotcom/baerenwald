"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { PortalBrandRoot } from "@/components/shared/PortalBrandRoot";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
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
  lang: MeldeLang;
  onLangChange?: (lang: MeldeLang) => void;
  children: ReactNode;
  /** Ohne äußeren Desktop-Padding (z. B. Fehler mittig) */
  compact?: boolean;
  className?: string;
  /** Footer ausblenden */
  hideFooter?: boolean;
};

/**
 * Mock `mieterWLFrame` + `wlHeader` / `wlFooter` / Branding A2.
 */
export function MieterWlFrame({
  brand,
  lang,
  onLangChange,
  children,
  compact,
  className,
  hideFooter,
}: MieterWlFrameProps) {
  return (
    <PortalBrandRoot
      className={cn("mieter-wl-page", className)}
      primary={brand.primary}
      primaryDk={brand.primaryDk}
      soft={brand.soft}
    >
      <div className={cn("mieter-wl-shell", compact && "mieter-wl-shell--compact")}>
        <MieterWlHeader
          brand={brand}
          lang={lang}
          onLangChange={onLangChange}
        />
        <div className="mieter-wl-body">{children}</div>
        {!hideFooter ? <MieterWlFooter brand={brand} lang={lang} /> : null}
      </div>
    </PortalBrandRoot>
  );
}

export function MieterWlHeader({
  brand,
  lang,
  onLangChange,
}: {
  brand: MieterWlBrand;
  lang: MeldeLang;
  onLangChange?: (lang: MeldeLang) => void;
}) {
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
      {onLangChange ? (
        <div className="mieter-wl-lang" role="group" aria-label="Language">
          {(["de", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={cn(
                "mieter-wl-lang-btn",
                lang === l && "mieter-wl-lang-btn--active"
              )}
              onClick={() => onLangChange(l)}
            >
              {l}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function MieterWlFooter({
  brand,
  lang,
}: {
  brand: MieterWlBrand;
  lang: MeldeLang;
}) {
  return (
    <footer className="mieter-wl-footer">
      <p>{formatMieterWlFooterContact(brand, lang)}</p>
      <p className="mieter-wl-footer-noreply">{mieterWlFooterNoreply(lang)}</p>
    </footer>
  );
}

/** Mock `wlCard` */
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
