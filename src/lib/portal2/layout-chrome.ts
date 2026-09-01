/**
 * C1 — Layout-Contract: Listen = weiße Karten auf Page-BG (CRM-Mobil-Parität).
 * Detail-Sections: card / responsive = portal-section-card; flat = ohne Rahmen.
 * Card-in-Card-Regeln: section-card-contract.ts
 */

import type { CSSProperties } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/** Listen-Darstellung: mobile Karte, ab lg flache Zeile. */
export type PortalListVariant = "row" | "card" | "responsive";

/**
 * Detail-Section-Chrome:
 * - `card` / `responsive` = weiße Section-Card (mobil + Desktop)
 * - `flat` = ohne Border (seltene Ausnahmen)
 */
export type PortalDetailChrome = "card" | "flat" | "responsive";

export const PORTAL_LIST_VARIANT_DEFAULT: PortalListVariant = "responsive";
export const PORTAL_DETAIL_CHROME_DEFAULT: PortalDetailChrome = "responsive";

/** Wrapper um Vorgangslisten — gestapelte weiße Karten mit Abstand. */
export function portalListStackClass(variant: PortalListVariant = "responsive"): string {
  if (variant === "row") return "portal-list-panel portal-list-rows";
  return "portal-list-stack flex flex-col gap-3.5";
}

/** Klassen für eine Listenzeile/-karte. */
export function portalListItemClass(
  variant: PortalListVariant = "responsive",
  opts?: { selected?: boolean }
): string {
  const selected = opts?.selected;
  if (variant === "row") {
    return cn(
      "relative w-full bg-transparent text-left transition-colors hover:bg-[var(--p2-hover,#f7f8fa)]",
      "px-4 py-3.5",
      selected && "bg-[var(--p2-selected,#f0f2f0)]"
    );
  }
  return cn(
    "portal-list-card flex w-full items-stretch gap-3.5 rounded-[20px] border-0 px-[18px] py-[17px] text-left transition-shadow",
    selected
      ? "ring-2 ring-[var(--org-primary,var(--p2-primary))]/25"
      : "hover:shadow-[var(--p2-shadow-hover)]"
  );
}

export function portalListItemBorderStyle(
  variant: PortalListVariant = "responsive"
): CSSProperties | undefined {
  if (variant === "row") return undefined;
  return {
    border: "none",
    boxShadow: "var(--p2-shadow, 0 2px 10px rgba(16,32,24,0.05))",
  };
}

/** Detail-Section-Chrome: `card` / `responsive` = weiße Section-Card; `flat` = ohne Rahmen. */
export function portalDetailSectionClass(
  chrome: PortalDetailChrome = "responsive"
): string {
  if (chrome === "flat") {
    return "space-y-3 rounded-none border-0 bg-transparent p-0 shadow-none";
  }
  return cn("portal-section-card space-y-3 p-5");
}

export function portalDetailSectionBorderStyle(
  chrome: PortalDetailChrome = "responsive"
): CSSProperties | undefined {
  if (chrome === "flat") return undefined;
  return {
    border: "none",
    boxShadow: "var(--p2-shadow, 0 2px 10px rgba(16,32,24,0.05))",
    borderRadius: "22px",
  };
}

/** C2 — HV-Detail Section-Nav (Reihenfolge = Tab-Reihenfolge). */
export const PORTAL_DETAIL_SECTION_IDS = [
  "uebersicht",
  "angebot",
  "hm_pruefung",
  "bautagebuch",
  "versicherung",
  "dokumente",
  "verlauf",
] as const;

export type PortalDetailSectionId = (typeof PORTAL_DETAIL_SECTION_IDS)[number];

export const PORTAL_DETAIL_SECTION_LABELS: Record<
  PortalDetailSectionId,
  string
> = {
  /** Nicht „Übersicht“ — Shell-Nav nutzt das schon. */
  uebersicht: "Details",
  angebot: "Angebot",
  hm_pruefung: "Checkliste",
  bautagebuch: "Updates",
  versicherung: "Versicherung",
  dokumente: "Dokumente",
  verlauf: "Verlauf",
};
