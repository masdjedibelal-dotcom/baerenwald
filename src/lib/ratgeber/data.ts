import type { RatgeberData } from "@/lib/ratgeber/types";

export type { RatgeberData } from "@/lib/ratgeber/types";

import { malerarbeitenKostenMuenchen } from "@/lib/ratgeber/articles/malerarbeiten-kosten-muenchen";
import {
  badRenovierenAblauf,
  badSanierungKostenMuenchen,
  bodenbelagKostenMuenchen,
  dacharbeitenKostenMuenchen,
  fensterTauschenKosten,
  gartenpflegeKostenMuenchen,
  heizungTauschenKosten,
  trockenbauKostenMuenchen,
  waermepumpeFoerderung2025,
  winterdienstKostenMuenchen,
  wohnungRenovierenKostenMuenchen,
} from "@/lib/ratgeber/articles/batch";
import { GUIDE_PAGES } from "@/lib/ratgeber/articles/guide-pages";

export const RATGEBER_DATA: Record<string, RatgeberData> = {
  [malerarbeitenKostenMuenchen.slug]: malerarbeitenKostenMuenchen,
  [badSanierungKostenMuenchen.slug]: badSanierungKostenMuenchen,
  [bodenbelagKostenMuenchen.slug]: bodenbelagKostenMuenchen,
  [heizungTauschenKosten.slug]: heizungTauschenKosten,
  [wohnungRenovierenKostenMuenchen.slug]: wohnungRenovierenKostenMuenchen,
  [gartenpflegeKostenMuenchen.slug]: gartenpflegeKostenMuenchen,
  [winterdienstKostenMuenchen.slug]: winterdienstKostenMuenchen,
  [waermepumpeFoerderung2025.slug]: waermepumpeFoerderung2025,
  [badRenovierenAblauf.slug]: badRenovierenAblauf,
  [fensterTauschenKosten.slug]: fensterTauschenKosten,
  [trockenbauKostenMuenchen.slug]: trockenbauKostenMuenchen,
  [dacharbeitenKostenMuenchen.slug]: dacharbeitenKostenMuenchen,
  ...Object.fromEntries(GUIDE_PAGES.map((g) => [g.slug, g])),
};

export function ratgeberDataForSlug(slug: string): RatgeberData | undefined {
  return RATGEBER_DATA[slug];
}
