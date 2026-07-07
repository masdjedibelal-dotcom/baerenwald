import { BAD_DEFAULT_PRODUKT_SLUG, BAD_FAMILIE_LABEL } from "@/lib/products/katalog-bad";
import { FIX_DEFAULT_PRODUKT_SLUG, FIX_FAMILIE_LABEL } from "@/lib/products/katalog-fix";
import {
  HAUSBETREUUNG_FAMILIE_LABEL,
  HAUSSERVICE_DEFAULT_PRODUKT_SLUG,
} from "@/lib/products/katalog-hausservice";
import type { ProduktFamilie } from "@/lib/products/types";

export type HeroPickerChip = {
  id: string;
  label: string;
  familie: ProduktFamilie;
  produktSlug: string;
};

/** Katalog-Einstieg: Neues Bad · Service & Betreuung · Sanieren & Notfall */
export const HERO_KATALOG_CHIPS: HeroPickerChip[] = [
  {
    id: "projekt",
    label: BAD_FAMILIE_LABEL,
    familie: "bad",
    produktSlug: BAD_DEFAULT_PRODUKT_SLUG,
  },
  {
    id: "service",
    label: HAUSBETREUUNG_FAMILIE_LABEL,
    familie: "hausservice",
    produktSlug: HAUSSERVICE_DEFAULT_PRODUKT_SLUG,
  },
  {
    id: "reparatur",
    label: FIX_FAMILIE_LABEL,
    familie: "fix",
    produktSlug: FIX_DEFAULT_PRODUKT_SLUG,
  },
];

/** Sekundärlink unter den Chips — Leistungskarussell auf der Landing. */
export const HERO_WEITERE_LEISTUNGEN_HREF = "#leistungen";

/** Alias für ältere Imports / HMR */
export const HERO_PICKER_CHIPS = HERO_KATALOG_CHIPS;
