"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ConversionCheckoutModal } from "@/components/products/ConversionCheckoutModal";
import { ConversionWidget } from "@/components/products/ConversionWidget";
import { KatalogLeadForm } from "@/components/products/KatalogLeadForm";
import { ProduktPickerCore } from "@/components/products/ProduktPickerCore";
import {
  BAD_DEFAULT_PRODUKT_SLUG,
  getProdukteByFamilie,
} from "@/lib/products";
import { BAD_FAMILIE_LABEL } from "@/lib/products/katalog-bad";
import { HAUSBETREUUNG_FAMILIE_LABEL } from "@/lib/products/katalog-hausservice";
import {
  HERO_KATALOG_CHIPS,
  HERO_WEITERE_LEISTUNGEN_HREF,
  type HeroPickerChip,
} from "@/lib/landing/hero-picker-chips";
import type { ProduktFamilie } from "@/lib/products/types";
import { track } from "@/lib/analytics";

type Ctx = {
  tab: ProduktFamilie;
  panelOpen: boolean;
  selectedSlug: string;
  produktSlugs: string[];
  onProduktSelect: (slug: string) => void;
  onCheckout: () => void;
  onChipClick: (chip: HeroPickerChip) => void;
  activeChipId: string | null;
};

const ProductPickerCtx = createContext<Ctx | null>(null);

function useProductPickerCtx() {
  const ctx = useContext(ProductPickerCtx);
  if (!ctx) throw new Error("ProductPickerProvider fehlt");
  return ctx;
}

type ProviderProps = {
  children: ReactNode;
  embedded?: boolean;
  panelOpen?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
};

export function ProductPickerProvider({
  children,
  embedded = false,
  panelOpen: panelOpenProp,
  onPanelOpenChange,
}: ProviderProps) {
  const defaultChip = HERO_KATALOG_CHIPS[0];
  const [tab, setTab] = useState<ProduktFamilie>(defaultChip.familie);
  const [panelOpenInternal, setPanelOpenInternal] = useState(!embedded);
  const [selectedSlug, setSelectedSlug] = useState(BAD_DEFAULT_PRODUKT_SLUG);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeChipId, setActiveChipId] = useState<string | null>(null);

  const panelOpen = panelOpenProp ?? panelOpenInternal;
  const setPanelOpen = onPanelOpenChange ?? setPanelOpenInternal;

  const openPicker = useCallback(
    (chip: HeroPickerChip) => {
      setTab(chip.familie);
      setSelectedSlug(chip.produktSlug);
      setActiveChipId(chip.id);
      setPanelOpen(true);
      setCheckoutOpen(false);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#produkte-${chip.id}`);
      }
    },
    [setPanelOpen]
  );

  const syncPickerFromHash = useCallback(() => {
    const hash = window.location.hash;
    if (!hash.includes("produkte")) return;
    const chipId = hash.replace(/^#produkte-?/, "") || defaultChip.id;
    const chip =
      HERO_KATALOG_CHIPS.find((c) => c.id === chipId) ?? HERO_KATALOG_CHIPS[0];
    setTab(chip.familie);
    setSelectedSlug(chip.produktSlug);
    setActiveChipId(chip.id);
    setPanelOpen(true);
    setCheckoutOpen(false);
  }, [setPanelOpen, defaultChip.id]);

  useEffect(() => {
    if (panelOpen && !activeChipId) {
      setActiveChipId(defaultChip.id);
    }
  }, [panelOpen, activeChipId, defaultChip.id]);

  useEffect(() => {
    syncPickerFromHash();
    window.addEventListener("hashchange", syncPickerFromHash);
    return () => window.removeEventListener("hashchange", syncPickerFromHash);
  }, [syncPickerFromHash]);

  const onProduktSelect = useCallback((slug: string) => {
    setSelectedSlug(slug);
    track.produktGewaehlt(slug, "landing", "landing");
  }, []);

  const produktSlugs = useMemo(
    () => getProdukteByFamilie(tab).map((p) => p.slug),
    [tab]
  );

  const onChipClick = useCallback(
    (chip: HeroPickerChip) => {
      track.heroChipKlick(chip.id);
      if (activeChipId === chip.id && panelOpen) {
        setPanelOpen(false);
        setActiveChipId(null);
        if (window.location.hash.includes("produkte")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        return;
      }
      openPicker(chip);
    },
    [activeChipId, panelOpen, openPicker, setPanelOpen]
  );

  const value: Ctx = {
    tab,
    panelOpen,
    selectedSlug,
    produktSlugs,
    onProduktSelect,
    onCheckout: () => setCheckoutOpen(true),
    onChipClick,
    activeChipId,
  };

  return (
    <ProductPickerCtx.Provider value={value}>
      {children}
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
    </ProductPickerCtx.Provider>
  );
}

export function ProductPickerChips() {
  const { panelOpen, activeChipId, onChipClick } = useProductPickerCtx();

  return (
    <div className="hero-picker-chips-wrap">
      <div className="hero-chips hero-picker-chips" role="tablist" aria-label="Katalog wählen">
        {HERO_KATALOG_CHIPS.map((chip) => {
          const active = activeChipId === chip.id && panelOpen;
          return (
            <a
              key={chip.id}
              href="#produkte"
              role="tab"
              aria-selected={active}
              aria-expanded={active}
              className={`hero-chip-link hero-chip-link--button${active ? " hero-chip-link--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onChipClick(chip);
              }}
            >
              {chip.label}
            </a>
          );
        })}
      </div>
      <Link
        href={HERO_WEITERE_LEISTUNGEN_HREF}
        className="hero-chips-weitere"
        onClick={() => track.heroChipKlick("weitere-leistungen")}
      >
        Weitere Leistungen →
      </Link>
    </div>
  );
}

export function ProductPickerPanel() {
  const { tab, panelOpen, produktSlugs, selectedSlug, onProduktSelect, onCheckout } =
    useProductPickerCtx();

  return (
    <ConversionWidget id="produkte" variant="hero">
      <div
        className={`conversion-picker-panel${panelOpen ? " conversion-picker-panel--open" : ""} conversion-picker-panel--hero`}
        role="tabpanel"
        aria-label={`${tab === "hausservice" ? HAUSBETREUUNG_FAMILIE_LABEL : tab === "bad" ? BAD_FAMILIE_LABEL : tab} Pakete`}
        aria-hidden={!panelOpen}
      >
        <ProduktPickerCore
          produktSlugs={produktSlugs}
          selectedSlug={selectedSlug}
          onSelect={onProduktSelect}
          familie={tab}
          onCheckout={onCheckout}
          trackQuelle="landing"
        />
      </div>
    </ConversionWidget>
  );
}
