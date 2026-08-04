"use client";

import { useMemo } from "react";

import { PlanComparisonTable } from "@/components/products/conversion/PlanComparisonTable";
import { track } from "@/lib/analytics";
import {
  bandForGroesseQm,
  buildBadComparisonColumns,
  buildBadComparisonRows,
  groesseFromQm,
} from "@/lib/products/bad-comparison";
import { getProdukt } from "@/lib/products";
import type { BadAusstattungStufe, ProduktGroesse } from "@/lib/products/types";

type Props = {
  produktSlugs: string[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onCheckout?: () => void;
  openCheckoutOnSelect?: boolean;
  trackQuelle?: string;
};

function slugForBad(groesse: ProduktGroesse, stufe: BadAusstattungStufe): string {
  return `bad-${groesse}-${stufe}`;
}

function isBadStufe(stufe: string | undefined): stufe is BadAusstattungStufe {
  return stufe === "standard" || stufe === "komfort" || stufe === "gehoben";
}

export function BadProduktPicker({
  produktSlugs,
  selectedSlug,
  onSelect,
  onCheckout,
  openCheckoutOnSelect = true,
  trackQuelle = "landing",
}: Props) {
  const selected = getProdukt(selectedSlug);

  const groesse = selected?.groesse ?? "m";
  const stufe: BadAusstattungStufe = isBadStufe(selected?.stufe) ? selected.stufe : "komfort";
  const groesseQm = bandForGroesseQm(
    groesse === "s" ? 4 : groesse === "l" ? 10 : 6
  ).value;

  const columns = useMemo(
    () => buildBadComparisonColumns(groesse),
    [groesse]
  );

  const rows = useMemo(
    () =>
      buildBadComparisonRows(groesseQm, (qm) => {
        const nextGroesse = groesseFromQm(qm);
        track.konverterGroesseChange("bad", nextGroesse, trackQuelle);
        const slug = slugForBad(nextGroesse, stufe);
        if (produktSlugs.includes(slug)) onSelect(slug);
      }),
    [groesseQm, stufe, produktSlugs, onSelect, trackQuelle]
  );

  function selectStufe(nextStufe: BadAusstattungStufe) {
    const slug = slugForBad(groesse, nextStufe);
    if (produktSlugs.includes(slug)) onSelect(slug);
  }

  function onCta(nextStufe: BadAusstattungStufe) {
    selectStufe(nextStufe);
    if (openCheckoutOnSelect && onCheckout) onCheckout();
  }

  return (
    <div className="conversion-plans conversion-plans--bad">
      <PlanComparisonTable
        asideHeading="Dein Bad"
        priceHint="Endgültiger Preis nach Besichtigung"
        columns={columns}
        rows={rows}
        selectedColumnId={stufe}
        onSelectColumn={(id) => selectStufe(id as BadAusstattungStufe)}
        onCta={(id) => onCta(id as BadAusstattungStufe)}
      />
    </div>
  );
}
