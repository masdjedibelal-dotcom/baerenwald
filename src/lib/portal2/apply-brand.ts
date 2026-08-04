import type { CSSProperties } from "react";

import {
  resolveBrandPalette,
  type OrgBrand,
} from "@/lib/portal2/brand-presets";
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

export function applyBrandFromOrg(org: Pick<OrgBrand, "primary" | "primaryDk" | "soft">): CSSProperties {
  return applyBrandStyle(org);
}

/** DOM-Variante für Print/Aushang außerhalb von React. */
export function applyBrandToElement(
  el: HTMLElement,
  input: ApplyBrandInput
): void {
  const p = resolveBrandPalette(input);
  el.style.setProperty(PORTAL_CSS_VARS.brandPrimary, p.primary);
  el.style.setProperty(PORTAL_CSS_VARS.brandPrimaryDk, p.primaryDk);
  el.style.setProperty(PORTAL_CSS_VARS.brandSoft, p.soft);
  el.style.setProperty(PORTAL_CSS_VARS.primary, p.primary);
  el.style.setProperty(PORTAL_CSS_VARS.primaryDk, p.primaryDk);
  el.style.setProperty(PORTAL_CSS_VARS.primarySoft, p.soft);
}
