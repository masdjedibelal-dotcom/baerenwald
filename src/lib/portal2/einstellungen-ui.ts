/**
 * Portal 2.0 D12 — `screenSettings` Shared Helpers (pf / edField / grid2 / maxW).
 */

import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";
import { istTeo } from "@/lib/marke";

/** Mock: `maxW = hw ? 640 : 560` */
export function einstellungenContentMaxWidth(
  variant: EinstellungenVariant
): 640 | 560 {
  return variant === "handwerker" ? 640 : 560;
}

/** Handwerker Firmendaten — Mock Copy 1:1. */
export const HW_FIRMEN_CARD_TITLE =
  "Firmendaten für Angebote & Rechnungen" as const;

export const HW_FIRMEN_INTRO = "" as const;

export const HW_FIRMEN_FOOTER = "" as const;

/** TEO schreibt Abschnittstitel normal (wie die Website), Bärenwald bleibt bei Großbuchstaben. */
export const HW_FIRMEN_SECTIONS = istTeo
  ? {
      logo: "Firmenlogo",
      anschrift: "Anschrift und Kontakt",
      steuer: "Steuer und Register",
      bank: "Bankverbindung (für Rechnungen)",
    }
  : {
      logo: "FIRMENLOGO",
      anschrift: "ANSCHRIFT & KONTAKT",
      steuer: "STEUER & REGISTER",
      bank: "BANKVERBINDUNG (für Rechnungen)",
    };

/** Mieter Konto — Zugang-Karte. */
export const MIETER_KONTO_ZUGANG_TITLE = "Zugang" as const;

export function mieterKontoZugangHinweis(orgMail: string): string {
  return `Ihr Zugang wird von Ihrer Verwaltung verwaltet. Bei Fragen zum Konto wenden Sie sich an ${orgMail}.`;
}

export const MIETER_SPRACHE_TITLE = "Sprache" as const;

export type PortalUiLang = "de" | "en";

export const PORTAL_UI_LANG_STORAGE_KEY = "portal2_ui_lang" as const;
