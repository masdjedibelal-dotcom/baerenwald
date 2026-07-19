/**
 * Portal 2.0 D12 — `screenSettings` Shared Helpers (pf / edField / grid2 / maxW).
 */

import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";

/** Mock: `maxW = hw ? 640 : 560` */
export function einstellungenContentMaxWidth(
  variant: EinstellungenVariant
): 640 | 560 {
  return variant === "handwerker" ? 640 : 560;
}

export function einstellungenMaxWidthClass(
  variant: EinstellungenVariant
): string {
  return variant === "handwerker" ? "max-w-[640px]" : "max-w-[560px]";
}

/** Handwerker Firmendaten — Mock Copy 1:1. */
export const HW_FIRMEN_CARD_TITLE =
  "Firmendaten für Angebote & Rechnungen" as const;

export const HW_FIRMEN_INTRO =
  "Diese Stammdaten stehen im Kopf und Fuß jedes Angebots und jeder Rechnung. Pflichtangaben nach §14 UStG (Steuernummer/USt-IdNr., vollständige Anschrift) sind für den Rechnungsversand erforderlich." as const;

export const HW_FIRMEN_LOGO_HINT =
  "Erscheint oben rechts auf allen Dokumenten." as const;

export const HW_FIRMEN_FOOTER =
  "Änderungen werden automatisch gespeichert und für neue Angebote & Rechnungen verwendet." as const;

export const HW_FIRMEN_SECTIONS = {
  logo: "FIRMENLOGO",
  anschrift: "ANSCHRIFT & KONTAKT",
  steuer: "STEUER & REGISTER",
  bank: "BANKVERBINDUNG (für Rechnungen)",
} as const;

/** Mieter Konto — Zugang-Karte. */
export const MIETER_KONTO_ZUGANG_TITLE = "Zugang" as const;

export function mieterKontoZugangHinweis(orgMail: string): string {
  return `Ihr Zugang wird von Ihrer Hausverwaltung verwaltet. Bei Fragen zum Konto wenden Sie sich an ${orgMail}.`;
}

export const MIETER_SPRACHE_TITLE = "Sprache" as const;
export const MIETER_SPRACHE_INTRO =
  "Sprache für das Portal und den Melde-Flow (A3)." as const;

export type PortalUiLang = "de" | "en";

export const PORTAL_UI_LANG_STORAGE_KEY = "portal2_ui_lang" as const;
