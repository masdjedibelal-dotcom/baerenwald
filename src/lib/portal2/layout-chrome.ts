/**
 * C1 — Layout-Contract: Mobile Cards / Desktop flach.
 * Listen & Detail-Sections nutzen dieselben Tokens.
 */

import type { CSSProperties } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/** Listen-Darstellung: mobile Karte, ab lg flache Zeile. */
export type PortalListVariant = "row" | "card" | "responsive";

/**
 * Detail-Section-Chrome:
 * - `card` = Border-Card (Mobile / interaktive Blöcke)
 * - `flat` = ohne Border (Desktop-Sections)
 * - `responsive` = card &lt; lg, flat ab lg
 */
export type PortalDetailChrome = "card" | "flat" | "responsive";

export const PORTAL_LIST_VARIANT_DEFAULT: PortalListVariant = "responsive";
export const PORTAL_DETAIL_CHROME_DEFAULT: PortalDetailChrome = "responsive";

/** Wrapper um Vorgangslisten (gap mobil, Panel ab lg). */
export function portalListStackClass(variant: PortalListVariant = "responsive"): string {
  if (variant === "card") return "flex flex-col gap-2.5";
  if (variant === "row") return "portal-list-panel portal-list-rows";
  return cn(
    "flex flex-col gap-2.5",
    "lg:gap-0 lg:overflow-hidden lg:rounded-[var(--p2-radius-md,12px)] lg:border lg:bg-[var(--p2-panel,#fff)]",
    "lg:divide-y lg:divide-[var(--p2-line2)]"
  );
}

/** Klassen für eine Listenzeile/-karte. */
export function portalListItemClass(
  variant: PortalListVariant = "responsive",
  opts?: { selected?: boolean }
): string {
  const selected = opts?.selected;
  if (variant === "card") {
    return cn(
      "flex w-full items-start gap-3 rounded-[var(--p2-radius-md,12px)] border bg-[var(--p2-panel,#fff)] px-3.5 py-3.5 text-left shadow-sm transition-shadow sm:px-4",
      selected
        ? "ring-2 ring-[var(--org-primary,var(--p2-primary))]/25"
        : "hover:shadow-md"
    );
  }
  if (variant === "row") {
    return cn(
      "relative w-full bg-transparent text-left transition-colors hover:bg-[var(--p2-hover,#f7f8fa)]",
      "px-4 py-3.5",
      selected && "bg-[var(--p2-selected,#f0f2f0)]"
    );
  }
  return cn(
    "flex w-full items-start gap-3 text-left transition-colors",
    "rounded-[var(--p2-radius-md,12px)] border bg-[var(--p2-panel,#fff)] px-3.5 py-3.5 shadow-sm sm:px-4",
    "lg:rounded-none lg:border-0 lg:border-transparent lg:bg-transparent lg:shadow-none lg:px-4 lg:py-3.5",
    selected
      ? "ring-2 ring-[var(--org-primary,var(--p2-primary))]/25 lg:ring-0 lg:bg-[var(--p2-selected,#f0f2f0)]"
      : "hover:shadow-md lg:hover:shadow-none lg:hover:bg-[var(--p2-hover,#f7f8fa)]"
  );
}

export function portalListItemBorderStyle(
  variant: PortalListVariant = "responsive"
): CSSProperties | undefined {
  if (variant === "row") return undefined;
  return { borderColor: PORTAL_VAR.line };
}

/** Klassen für Detail-Sections (Übersicht, BT, Docs, …). */
export function portalDetailSectionClass(
  chrome: PortalDetailChrome = "responsive"
): string {
  if (chrome === "flat") {
    return "space-y-3 rounded-none border-0 bg-transparent p-0 shadow-none";
  }
  if (chrome === "card") {
    return cn(
      "space-y-3 rounded-[var(--p2-radius-lg,16px)] border bg-[var(--p2-panel,#fff)] p-4 shadow-sm",
      "border-[var(--p2-line)]"
    );
  }
  return cn(
    "space-y-3 rounded-[var(--p2-radius-lg,16px)] border bg-[var(--p2-panel,#fff)] p-4 shadow-sm border-[var(--p2-line)]",
    "lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
  );
}

export function portalDetailSectionBorderStyle(
  chrome: PortalDetailChrome = "responsive"
): CSSProperties | undefined {
  if (chrome === "flat") return undefined;
  return { borderColor: PORTAL_VAR.line };
}

/** C2 — HV-Detail Anchor-Nav (Reihenfolge = Scroll-Reihenfolge). */
export const PORTAL_DETAIL_SECTION_IDS = [
  "uebersicht",
  "angebot",
  "bautagebuch",
  "dokumente",
  "verlauf",
] as const;

export type PortalDetailSectionId = (typeof PORTAL_DETAIL_SECTION_IDS)[number];

export const PORTAL_DETAIL_SECTION_LABELS: Record<
  PortalDetailSectionId,
  string
> = {
  uebersicht: "Übersicht",
  angebot: "Angebot",
  bautagebuch: "Bautagebuch",
  dokumente: "Dokumente",
  verlauf: "Verlauf",
};
