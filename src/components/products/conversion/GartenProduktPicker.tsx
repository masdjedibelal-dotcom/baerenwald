"use client";

import { useMemo } from "react";

import { PlanCard } from "@/components/products/conversion/PlanCard";
import { PlanLeistungenHinweis } from "@/components/products/conversion/PlanLeistungenHinweis";
import { PlanVergleichAccordion } from "@/components/products/conversion/PlanVergleichAccordion";
import { GARTEN_PAKET_BASELINE } from "@/lib/products/card-highlights";
import { getProdukt, type Produkt } from "@/lib/products";
import { buildGartenVergleich } from "@/lib/products/plan-vergleich";
import { GARTEN_GROESSE_LABELS } from "@/lib/leistungen/converter-copy";
import type { ProduktGroesse } from "@/lib/products/types";

type Props = {
  produktSlugs: string[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onCheckout?: () => void;
  openCheckoutOnSelect?: boolean;
};

const GARTEN_COL_LABELS = {
  s: GARTEN_GROESSE_LABELS.s.label,
  m: GARTEN_GROESSE_LABELS.m.label,
  l: GARTEN_GROESSE_LABELS.l.label,
} as const;

export function GartenProduktPicker({
  produktSlugs,
  selectedSlug,
  onSelect,
  onCheckout,
  openCheckoutOnSelect = true,
}: Props) {
  const selected = getProdukt(selectedSlug);

  const groessen = useMemo(() => {
    const set = new Set<ProduktGroesse>();
    for (const slug of produktSlugs) {
      const p = getProdukt(slug);
      if (p?.groesse) set.add(p.groesse);
    }
    return (["s", "m", "l"] as ProduktGroesse[]).filter((g) => set.has(g));
  }, [produktSlugs]);

  const cards = useMemo(
    () =>
      groessen
        .map((g) => getProdukt(`garten-pflege-${g}`))
        .filter((p): p is Produkt => p != null && produktSlugs.includes(p.slug)),
    [groessen, produktSlugs]
  );

  const groesse = selected?.groesse ?? groessen[1] ?? "m";

  const vergleich = useMemo(
    () => buildGartenVergleich(groessen, GARTEN_COL_LABELS),
    [groessen]
  );

  function activate(slug: string) {
    onSelect(slug);
    if (openCheckoutOnSelect && onCheckout) onCheckout();
  }

  return (
    <div className="conversion-plans conversion-plans--garten">
      <div className="conversion-plan-stack">
        <div className="conversion-plan-grid" role="group" aria-label="Gartengrößen vergleichen">
          {cards.map((produkt) => (
            <PlanCard
              key={produkt.slug}
              produkt={produkt}
              familie="garten"
              selected={selectedSlug === produkt.slug}
              onActivate={activate}
            />
          ))}
        </div>

        <PlanVergleichAccordion
          baseline={GARTEN_PAKET_BASELINE}
          columns={vergleich.columns}
          rows={vergleich.rows}
          selectedColumnId={groesse}
          toggleLabel="Paketvergleich anzeigen"
        />
        <PlanLeistungenHinweis />
      </div>
    </div>
  );
}
