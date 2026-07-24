"use client";

import { useMemo, useState } from "react";

import { PlanComparisonTable } from "@/components/products/conversion/PlanComparisonTable";
import { track } from "@/lib/analytics";
import { getProdukt } from "@/lib/products";
import {
  buildHausserviceComparisonColumns,
  buildHausserviceComparisonRows,
} from "@/lib/products/hausservice-comparison";
import {
  HAUSSERVICE_DEFAULT_INPUT,
  type HausservicePreisInput,
} from "@/lib/products/hausservice-preis";
import type { HausserviceStufe } from "@/lib/products/types";

type Props = {
  produktSlugs: string[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onCheckout?: () => void;
  openCheckoutOnSelect?: boolean;
  trackQuelle?: string;
};

function slugForHausservice(stufe: HausserviceStufe): string {
  return `hausservice-${stufe}`;
}

export function HausserviceProduktPicker({
  selectedSlug,
  onSelect,
  onCheckout,
  openCheckoutOnSelect = true,
  trackQuelle = "landing",
}: Props) {
  const [serviceInput, setServiceInput] = useState<HausservicePreisInput>(
    HAUSSERVICE_DEFAULT_INPUT
  );

  const selected = getProdukt(selectedSlug);
  const selectedStufe: HausserviceStufe =
    (selected?.stufe as HausserviceStufe | undefined) ?? "komfort";

  const columns = useMemo(
    () => buildHausserviceComparisonColumns(serviceInput),
    [serviceInput]
  );

  const rows = useMemo(
    () =>
      buildHausserviceComparisonRows(
        serviceInput,
        (wohnflaeche) => {
          setServiceInput((prev) => ({ ...prev, wohnflaeche }));
          track.konverterGroesseChange("hausservice", String(wohnflaeche), trackQuelle);
        },
        (gartenQm) => {
          setServiceInput((prev) => ({ ...prev, gartenQm }));
          track.konverterGroesseChange("hausservice-garten", String(gartenQm), trackQuelle);
        }
      ),
    [serviceInput, trackQuelle]
  );

  function selectStufe(stufe: HausserviceStufe) {
    onSelect(slugForHausservice(stufe));
  }

  function onCta(stufe: HausserviceStufe) {
    selectStufe(stufe);
    if (openCheckoutOnSelect && onCheckout) onCheckout();
  }

  return (
    <div className="conversion-plans conversion-plans--hausservice">
      <PlanComparisonTable
        columns={columns}
        rows={rows}
        selectedColumnId={selectedStufe}
        onSelectColumn={(id) => selectStufe(id as HausserviceStufe)}
        onCta={(id) => onCta(id as HausserviceStufe)}
        priceHint="Individuell nach Frequenz und Leistungsbereich"
      />
    </div>
  );
}
