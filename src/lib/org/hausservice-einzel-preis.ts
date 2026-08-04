/** À-la-carte Monatspreis aus Einzel-Services (Hausmeister-Basis + Zusatzleistungen). */
import { PREISE } from "@/lib/funnel/price-calc";
import type { HausservicePreisInput } from "@/lib/products/hausservice-preis";
import { computeHausserviceMonatPreis } from "@/lib/products/hausservice-preis";

export type EinzelServiceId = "hausmeister" | "reinigung" | "garten" | "winter";

const EINZEL_MONAT: Record<EinzelServiceId, (input: HausservicePreisInput) => { min: number; max: number }> = {
  hausmeister: (input) => computeHausserviceMonatPreis("basis", input),
  reinigung: (input) => {
    const wf = Math.max(40, input.wohnflaeche || 100);
    return {
      min: Math.round(PREISE.reinigung.regelmaessig.min * wf),
      max: Math.round(PREISE.reinigung.regelmaessig.max * wf),
    };
  },
  garten: (input) => {
    const g = Math.max(0, input.gartenQm || 80);
    const tier =
      g < 100
        ? PREISE.garten.pflege_klein
        : g < 300
          ? PREISE.garten.pflege_mittel
          : PREISE.garten.pflege_gross;
    return { min: tier.min * 2, max: tier.max * 2 };
  },
  winter: () => ({
    min: Math.round(PREISE.winterdienst.saison.min / 6),
    max: Math.round(PREISE.winterdienst.saison.max / 6),
  }),
};

export function computeHausserviceEinzelMonatPreis(
  selected: EinzelServiceId[],
  input: HausservicePreisInput
): { min: number; max: number } {
  if (!selected.length) return { min: 0, max: 0 };
  let min = 0;
  let max = 0;
  for (const id of selected) {
    const band = EINZEL_MONAT[id](input);
    min += band.min;
    max += band.max;
  }
  return { min, max };
}
