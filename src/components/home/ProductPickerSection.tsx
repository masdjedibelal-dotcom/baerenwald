"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ConversionCheckoutModal } from "@/components/products/ConversionCheckoutModal";
import { ConversionWidget } from "@/components/products/ConversionWidget";
import { KatalogLeadForm } from "@/components/products/KatalogLeadForm";
import { ProduktPickerCore } from "@/components/products/ProduktPickerCore";
import { BAD_DEFAULT_PRODUKT_SLUG, getProdukteByFamilie } from "@/lib/products";
import type { ProduktFamilie } from "@/lib/products/types";
import { track } from "@/lib/analytics";

export {
  ProductPickerChips,
  ProductPickerPanel,
  ProductPickerProvider,
} from "./ProductPickerContext";

type Props = {
  embedded?: boolean;
};

/** Standalone-Section (nicht Hero) — eingebettet: {@link ProductPickerProvider} nutzen. */
export function ProductPickerSection({ embedded = false }: Props) {
  const [tab] = useState<ProduktFamilie>("bad");
  const [selectedSlug, setSelectedSlug] = useState(BAD_DEFAULT_PRODUKT_SLUG);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const produktSlugs = useMemo(
    () => getProdukteByFamilie(tab).map((p) => p.slug),
    [tab]
  );

  if (embedded) {
    return null;
  }

  function onProduktSelect(slug: string) {
    setSelectedSlug(slug);
    track.produktGewaehlt(slug, "landing", "landing");
  }

  return (
    <>
      <ConversionWidget
        id="produkte"
        eyebrow="Standardpakete"
        h2="Preisrahmen in 30 Sekunden"
        sub="Wähle dein Projekt — Größe und Paket im nächsten Schritt."
      >
        <div
          className="conversion-picker-panel conversion-picker-panel--open"
          role="tabpanel"
          aria-label={`${tab} Pakete`}
        >
          <ProduktPickerCore
            produktSlugs={produktSlugs}
            selectedSlug={selectedSlug}
            onSelect={onProduktSelect}
            familie={tab}
            onCheckout={() => setCheckoutOpen(true)}
            trackQuelle="landing"
          />
        </div>
      </ConversionWidget>

      <ConversionCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        produktSlug={selectedSlug}
        quelle="landing"
        leadForm={
          <KatalogLeadForm
            produktSlug={selectedSlug}
            leadContext={{
              katalogQuelle: "landing",
              funnelQuelle: "katalog",
            }}
          />
        }
        secondaryAction={
          <Link href="/kontakt" className="conversion-checkout-link">
            Kontakt aufnehmen →
          </Link>
        }
      />
    </>
  );
}
