"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ConversionCheckoutModal } from "@/components/products/ConversionCheckoutModal";
import { ConversionWidget } from "@/components/products/ConversionWidget";
import { KatalogLeadForm } from "@/components/products/KatalogLeadForm";
import { ProduktPickerCore } from "@/components/products/ProduktPickerCore";
import {
  BAD_DEFAULT_PRODUKT_SLUG,
  getProdukteByFamilie,
} from "@/lib/products";
import { BAD_FAMILIE_LABEL } from "@/lib/products/katalog-bad";
import { FIX_FAMILIE_LABEL } from "@/lib/products/katalog-fix";
import { HAUSBETREUUNG_FAMILIE_LABEL } from "@/lib/products/katalog-hausservice";
import {
  appendPortalPrefillToUrl,
  type PortalContactPrefill,
} from "@/lib/portal/portal-contact-prefill";
import { buildRechnerUrlFromProdukt } from "@/lib/products/build-rechner-url";
import {
  HERO_KATALOG_CHIPS,
  type HeroPickerChip,
} from "@/lib/landing/hero-picker-chips";
import type { ProduktFamilie } from "@/lib/products/types";
import { track } from "@/lib/analytics";

import "./portal-product-picker.css";

type PortalProductPickerProps = {
  contactPrefill: PortalContactPrefill;
};

const CHIP_LABELS: Record<string, string> = {
  bad: BAD_FAMILIE_LABEL,
  hausservice: HAUSBETREUUNG_FAMILIE_LABEL,
  fix: FIX_FAMILIE_LABEL,
};

export function PortalProductPicker({ contactPrefill }: PortalProductPickerProps) {
  const [tab, setTab] = useState<ProduktFamilie>("bad");
  const [selectedSlug, setSelectedSlug] = useState(BAD_DEFAULT_PRODUKT_SLUG);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const produktSlugs = useMemo(
    () => getProdukteByFamilie(tab).map((p) => p.slug),
    [tab]
  );

  const rechnerHref = useMemo(
    () =>
      appendPortalPrefillToUrl(
        buildRechnerUrlFromProdukt(selectedSlug, "portal"),
        contactPrefill
      ),
    [selectedSlug, contactPrefill]
  );

  const openPicker = useCallback((chip: HeroPickerChip) => {
    setTab(chip.familie);
    setSelectedSlug(chip.produktSlug);
    setActiveChipId(chip.id);
    setPanelOpen(true);
    setCheckoutOpen(false);
  }, []);

  const onChipClick = useCallback(
    (chip: HeroPickerChip) => {
      track.heroChipKlick(chip.id);
      if (activeChipId === chip.id && panelOpen) {
        setPanelOpen(false);
        setActiveChipId(null);
        return;
      }
      openPicker(chip);
    },
    [activeChipId, panelOpen, openPicker]
  );

  const onProduktSelect = useCallback((slug: string) => {
    setSelectedSlug(slug);
    track.produktGewaehlt(slug, "portal", "portal");
  }, []);

  return (
    <>
      <article className="card-bordered portal-produkt-card p-4">
        <p className="portal-text-body font-semibold text-text-primary">
          Neues Projekt starten
        </p>

        <div className="portal-produkt-chips-wrap">
          <div
            className="portal-produkt-chips"
            role="tablist"
            aria-label="Projekt wählen"
          >
            {HERO_KATALOG_CHIPS.map((chip) => {
              const active = activeChipId === chip.id && panelOpen;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-expanded={active}
                  className={`portal-produkt-chip${active ? " portal-produkt-chip--active" : ""}`}
                  onClick={() => onChipClick(chip)}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <ConversionWidget variant="hero">
          <div
            className={`conversion-picker-panel${panelOpen ? " conversion-picker-panel--open" : ""} conversion-picker-panel--inline conversion-picker-panel--hero`}
            role="tabpanel"
            aria-label={`${CHIP_LABELS[tab] ?? tab} Pakete`}
            aria-hidden={!panelOpen}
          >
            <ProduktPickerCore
              produktSlugs={produktSlugs}
              selectedSlug={selectedSlug}
              onSelect={onProduktSelect}
              familie={tab}
              onCheckout={() => setCheckoutOpen(true)}
              trackQuelle="portal"
            />
          </div>
        </ConversionWidget>
      </article>

      <ConversionCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        produktSlug={selectedSlug}
        quelle="portal"
        leadForm={
          <KatalogLeadForm
            produktSlug={selectedSlug}
            returnTo="/portal"
            contactPrefill={contactPrefill}
            leadContext={{
              katalogQuelle: "portal",
              funnelQuelle: "katalog",
            }}
          />
        }
        secondaryAction={
          <Link href={rechnerHref} className="conversion-checkout-link">
            Rechner individualisieren →
          </Link>
        }
      />
    </>
  );
}
