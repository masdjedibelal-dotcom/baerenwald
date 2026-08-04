"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanCard } from "@/components/products/conversion/PlanCard";
import { PlanLeistungenHinweis } from "@/components/products/conversion/PlanLeistungenHinweis";
import { getProdukt } from "@/lib/products";
import {
  FIX_DEFAULT_GEWERK,
  FIX_GEWERKE,
  getFixGewerk,
  getFixProdukteByGewerk,
  type FixGewerkId,
} from "@/lib/products/katalog-fix";

type Props = {
  produktSlugs: string[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onCheckout?: () => void;
  openCheckoutOnSelect?: boolean;
};

export function FixProduktPicker({
  produktSlugs,
  selectedSlug,
  onSelect,
  onCheckout,
  openCheckoutOnSelect = true,
}: Props) {
  const selectedProdukt = getProdukt(selectedSlug);
  const [gewerk, setGewerk] = useState<FixGewerkId>(
    selectedProdukt ? getFixGewerk(selectedProdukt) : FIX_DEFAULT_GEWERK
  );

  useEffect(() => {
    const produkt = getProdukt(selectedSlug);
    if (produkt) setGewerk(getFixGewerk(produkt));
  }, [selectedSlug]);

  const gewerkProdukte = useMemo(
    () =>
      getFixProdukteByGewerk(gewerk).filter((p) => produktSlugs.includes(p.slug)),
    [gewerk, produktSlugs]
  );

  const selected =
    gewerkProdukte.find((p) => p.slug === selectedSlug) ?? gewerkProdukte[0] ?? null;

  function selectGewerk(nextGewerk: FixGewerkId) {
    setGewerk(nextGewerk);
    const products = getFixProdukteByGewerk(nextGewerk).filter((p) =>
      produktSlugs.includes(p.slug)
    );
    const keepCurrent =
      selectedProdukt &&
      getFixGewerk(selectedProdukt) === nextGewerk &&
      products.some((p) => p.slug === selectedSlug);
    if (!keepCurrent) {
      const slug = products[0]?.slug;
      if (slug) onSelect(slug);
    }
  }

  function pickFix(slug: string) {
    onSelect(slug);
  }

  function activate(slug: string) {
    onSelect(slug);
    if (openCheckoutOnSelect && onCheckout) onCheckout();
  }

  if (!selected) return null;

  return (
    <div className="conversion-plans conversion-plans--fix">
      <p className="conversion-fix-heading">Welches Gewerk?</p>

      <div
        className="conversion-fix-pills"
        role="tablist"
        aria-label="Gewerk wählen"
      >
        {FIX_GEWERKE.map((item) => {
          const active = item.id === gewerk;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`conversion-fix-pill${active ? " conversion-fix-pill--active" : ""}`}
              onClick={() => selectGewerk(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="conversion-fix-heading conversion-fix-heading--sub">
        Was ist das Problem?
      </p>

      <div
        className="conversion-fix-grid"
        role="tabpanel"
        aria-label={`${FIX_GEWERKE.find((g) => g.id === gewerk)?.label ?? "Reparatur"} — Problem wählen`}
      >
        {gewerkProdukte.map((produkt) => (
          <PlanCard
            key={produkt.slug}
            produkt={produkt}
            familie="fix"
            selected={produkt.slug === selected.slug}
            hideGewerkBadge
            onActivate={pickFix}
            onCta={activate}
          />
        ))}
      </div>

      <PlanLeistungenHinweis />
    </div>
  );
}
