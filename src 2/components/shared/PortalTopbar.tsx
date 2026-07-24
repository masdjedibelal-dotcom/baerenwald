"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortalTopbarProps = {
  /** Mock: „Bärenwald“ / Org-Anzeigename */
  brandTitle: string;
  /** Mock: „Portale“ (uppercase faint) — Default „Portale“ */
  brandSubtitle?: string;
  brandLogoUrl?: string | null;
  brandMarkSrc?: string;
  /** Buchstabe im Mark-Quadrat wenn kein Logo (Mock: „B“) */
  brandKuerzel?: string | null;
  /**
   * Rechts: Glocke (B4). Keine Demo-Rollen-/Ansichts-Umschalter.
   * Alias: `headerActions` für bestehende Shell-Aufrufe.
   */
  notifications?: ReactNode;
  /** @deprecated Prefer `notifications` */
  headerActions?: ReactNode;
  className?: string;
};

/**
 * Portal 2.0 Topbar — Mock `topbar()` Struktur exakt.
 * Ohne Demo-Rollen-/Zustand-/Viewport-Umschalter (Auth + CSS Viewport).
 */
export function PortalTopbar({
  brandTitle,
  brandSubtitle = "Portale",
  brandLogoUrl,
  brandMarkSrc,
  brandKuerzel,
  notifications,
  headerActions,
  className,
}: PortalTopbarProps) {
  const right = notifications ?? headerActions;
  const kuerzel =
    (brandKuerzel?.trim() || brandTitle.trim().charAt(0) || "B").slice(0, 2).toUpperCase();

  return (
    <header
      className={cn("portal-ui portal-topbar", className)}
      data-portal-topbar=""
    >
      <div className="portal-topbar-brand">
        {brandLogoUrl ? (
          <Image
            src={brandLogoUrl}
            alt=""
            width={26}
            height={26}
            className="portal-topbar-mark portal-topbar-mark--img"
            unoptimized
          />
        ) : brandMarkSrc ? (
          <Image
            src={brandMarkSrc}
            alt=""
            width={26}
            height={26}
            className="portal-topbar-mark portal-topbar-mark--img"
          />
        ) : (
          <div className="portal-topbar-mark" aria-hidden>
            {kuerzel}
          </div>
        )}
        <div className="portal-topbar-brand-text">
          <div className="portal-topbar-title">{brandTitle}</div>
          <div className="portal-topbar-sub">{brandSubtitle}</div>
        </div>
      </div>

      <div className="portal-topbar-divider" aria-hidden />

      <div className="portal-topbar-spacer" />

      {right ? (
        <div className="portal-topbar-right">{right}</div>
      ) : null}
    </header>
  );
}
