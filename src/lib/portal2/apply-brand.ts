import type { CSSProperties } from "react";

import {
  resolveBrandPalette
} from "@/lib/portal2/brand-presets";
import { istTeo } from "@/lib/marke";
import { PORTAL_CSS_VARS } from "@/lib/portal2/tokens";

export type ApplyBrandInput = {
  primary?: string | null;
  primaryDk?: string | null;
  soft?: string | null;
};

/**
 * Mock `applyBrand(p)` — setzt WL-Farben als CSS-Variablen.
 * Wirkung: Mieter-Portal, Weblink-Melden, Aushang, Auth-Whitelabel, Org-Shell.
 */
export function applyBrandStyle(input: ApplyBrandInput): CSSProperties {
  // Servus TEO: ohne eigene WL-Farbe nichts setzen — sonst entstünde --p2-primary: var(--p2-primary)
  // (Selbstbezug → ungültig → grüne Hex-Rückfälle). Bärenwald bleibt vorerst unverändert (gleicher Effekt dort optisch neutral).
  if (istTeo && !input.primary?.trim()) return {};
  const p = resolveBrandPalette(input);
  return {
    [PORTAL_CSS_VARS.brandPrimary]: p.primary,
    [PORTAL_CSS_VARS.brandPrimaryDk]: p.primaryDk,
    [PORTAL_CSS_VARS.brandSoft]: p.soft,
    [PORTAL_CSS_VARS.primary]: p.primary,
    [PORTAL_CSS_VARS.primaryDk]: p.primaryDk,
    [PORTAL_CSS_VARS.primarySoft]: p.soft,
  } as CSSProperties;
}
