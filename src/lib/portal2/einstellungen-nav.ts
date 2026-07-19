/**
 * Portal 2.0 — Einstellungen-Subnav (Mock-Annotation: settingsTab).
 * Desktop: Seitenliste · Mobile: horizontale Tabs.
 */

import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";

export type EinstellungenTabId =
  | "profil"
  | "branding"
  | "freigabe"
  | "anschrift"
  | "steuer"
  | "bank"
  | "zugang";

export type EinstellungenNavItem = {
  id: EinstellungenTabId;
  label: string;
};

export const EINSTELLUNGEN_NAV_HV: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
  { id: "branding", label: "Branding & White-Label" },
  { id: "freigabe", label: "Freigabe-Regeln" },
];

export const EINSTELLUNGEN_NAV_HW: EinstellungenNavItem[] = [
  { id: "anschrift", label: "Anschrift & Kontakt" },
  { id: "steuer", label: "Steuer & Register" },
  { id: "bank", label: "Bankverbindung" },
];

export const EINSTELLUNGEN_NAV_MIETER: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
  { id: "zugang", label: "Zugang" },
];

export const EINSTELLUNGEN_NAV_PRIVAT: EinstellungenNavItem[] = [
  { id: "profil", label: "Profil" },
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

export function einstellungenNavStorageKey(
  variant: EinstellungenVariant
): string {
  return `portal2_settings_tab_${variant}`;
}

export const EINSTELLUNGEN_PAGE_EYEBROW: Record<
  EinstellungenVariant,
  string
> = {
  hv: "Hausverwaltung",
  privat: "Privatkunde",
  mieter: "Mieter",
  handwerker: "Handwerker",
};
