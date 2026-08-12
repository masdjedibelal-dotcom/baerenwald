/**
 * Portal 2.0 — Einstellungen-Subnav (Mock-Annotation: settingsTab).
 * Desktop: Seitenliste · Mobile: horizontale Tabs.
 */

import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";

export type EinstellungenTabId =
  | "profil"
  | "branding"
  | "freigabe"
  | "benachrichtigungen"
  | "anschrift"
  | "steuer"
  | "bank"
  | "stamm"
  | "zugang";

export type EinstellungenNavItem = {
  id: EinstellungenTabId;
  label: string;
};

/** HV: kein Branding-/Farben-Tab — Logo & Portal-Angaben liegen unter Profil. */
export const EINSTELLUNGEN_NAV_HV: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
  { id: "freigabe", label: "Freigabe-Regeln" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
];

export const EINSTELLUNGEN_NAV_HW: EinstellungenNavItem[] = [
  { id: "anschrift", label: "Daten" },
  { id: "stamm", label: "Stammunterlagen" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
];

export const EINSTELLUNGEN_NAV_MIETER: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
  { id: "zugang", label: "Zugang" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
];

export const EINSTELLUNGEN_NAV_PRIVAT: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
];

export function einstellungenNavFor(
  variant: EinstellungenVariant
): EinstellungenNavItem[] {
  switch (variant) {
    case "hv":
      return EINSTELLUNGEN_NAV_HV;
    case "handwerker":
      return EINSTELLUNGEN_NAV_HW;
    case "mieter":
      return EINSTELLUNGEN_NAV_MIETER;
    default:
      return EINSTELLUNGEN_NAV_PRIVAT;
  }
}

export function einstellungenDefaultTab(
  variant: EinstellungenVariant
): EinstellungenTabId {
  return einstellungenNavFor(variant)[0]?.id ?? "profil";
}

/** Alte HW-Tabs Steuer/Bank → Daten (anschrift). */
export function normalizeEinstellungenTabId(
  variant: EinstellungenVariant,
  raw: string | null | undefined
): EinstellungenTabId | null {
  const id = raw?.trim();
  if (!id) return null;
  if (variant === "handwerker" && (id === "steuer" || id === "bank")) {
    return "anschrift";
  }
  const nav = einstellungenNavFor(variant);
  return nav.some((n) => n.id === id) ? (id as EinstellungenTabId) : null;
}

export function einstellungenNavStorageKey(
  variant: EinstellungenVariant
): string {
  return `portal2_settings_tab_${variant}`;
}

export const EINSTELLUNGEN_PAGE_EYEBROW: Record<
  EinstellungenVariant,
  string
> = {
  hv: "Verwaltung",
  privat: "Privatkunde",
  mieter: "Mieter",
  handwerker: "Handwerker",
};
