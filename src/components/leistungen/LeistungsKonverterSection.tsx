"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ConversionCheckoutModal } from "@/components/products/ConversionCheckoutModal";
import { ConversionWidget } from "@/components/products/ConversionWidget";
import { KatalogLeadForm } from "@/components/products/KatalogLeadForm";
import { ProduktPickerCore } from "@/components/products/ProduktPickerCore";
import { getConversionMode } from "@/lib/leistungen/conversion-config";
import { getKonverterCopy } from "@/lib/leistungen/converter-copy";
import {
  getDefaultProduktForLeistung,
  getProdukteForLeistung,
  normalizeLeistungSlug,
} from "@/lib/leistungen/leistung-produkt-map";
import {
  buildRechnerUrl,
  buildRechnerUrlFromProdukt,
} from "@/lib/products/build-rechner-url";
import { getProdukt } from "@/lib/products/katalog";
import type { KatalogQuelle } from "@/lib/products/types";
import { SITE_CONFIG } from "@/lib/config";
import { track } from "@/lib/analytics";

type Props = {
  leistungSlug: string;
  katalogQuelle?: KatalogQuelle;
  notfall?: boolean;
};

const telHref = `tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`;

function parseHashFlags(): { produkt: string | null; notfall: boolean } {
  if (typeof window === "undefined") return { produkt: null, notfall: false };
  const raw = window.location.hash.slice(1);
  const notfall = raw.startsWith("notfall") || raw.includes("notfall");
  const qIdx = raw.indexOf("?");
  if (qIdx === -1) return { produkt: null, notfall };
  const anchor = raw.slice(0, qIdx);
  const produkt =
    anchor === "konverter"
      ? new URLSearchParams(raw.slice(qIdx + 1)).get("produkt")
      : null;
  return { produkt, notfall };
}

export function LeistungsKonverterSection({
  leistungSlug,
  katalogQuelle = "leistung",
  notfall: notfallProp = false,
}: Props) {
  const baseSlug = normalizeLeistungSlug(leistungSlug);
  const mode = getConversionMode(baseSlug);
  const copy = getKonverterCopy(baseSlug);
  const produktSlugs = getProdukteForLeistung(baseSlug);
  const defaultSlug =
    getDefaultProduktForLeistung(baseSlug) ?? produktSlugs[0] ?? "";

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notfallFromHash, setNotfallFromHash] = useState(false);

  useEffect(() => {
    const { produkt, notfall } = parseHashFlags();
    if (notfall) setNotfallFromHash(true);
    if (produkt && produktSlugs.includes(produkt)) {
      setSelectedSlug(produkt);
    }
  }, [produktSlugs]);

  const notfall = notfallProp || notfallFromHash;

  const onSelect = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      track.produktGewaehlt(slug, baseSlug, katalogQuelle);
    },
    [baseSlug, katalogQuelle]
  );

  const produkt = getProdukt(selectedSlug);
  const familie = produkt?.familie ?? "bad";

  const rechnerHref = useMemo(() => {
    if (selectedSlug) {
      return buildRechnerUrlFromProdukt(selectedSlug, katalogQuelle);
    }
    return buildRechnerUrl({ leistung: `${baseSlug}-muenchen` });
  }, [selectedSlug, katalogQuelle, baseSlug]);

  const checkoutModal = (
    <ConversionCheckoutModal
      open={checkoutOpen}
      onClose={() => setCheckoutOpen(false)}
      produktSlug={selectedSlug}
      quelle={katalogQuelle}
      leadForm={
        <KatalogLeadForm
          produktSlug={selectedSlug}
          leadContext={{
            leistungSlug: baseSlug,
            katalogQuelle,
            funnelQuelle: notfall ? "katalog_notfall" : "katalog",
          }}
        />
      }
      secondaryAction={
        <Link href={rechnerHref} className="conversion-checkout-link">
          Rechner individualisieren →
        </Link>
      }
    />
  );

  if (mode.type === "rechner_only") {
    return (
      <ConversionWidget
        id="konverter"
        eyebrow={copy.eyebrow}
        h2={copy.h2}
        sub={copy.sub}
        footer={
          <Link href={rechnerHref} className="conversion-btn-primary conversion-btn-primary--inline">
            Preisrahmen berechnen →
          </Link>
        }
      />
    );
  }

  if (notfall || mode.type === "notfall") {
    return (
      <>
        <ConversionWidget
          id="konverter"
          eyebrow={copy.eyebrow}
          h2={copy.h2}
          sub={copy.sub}
          notfall
          footer={
            produktSlugs.length === 0 ? (
              <a href={telHref} className="conversion-btn-primary conversion-btn-primary--inline conversion-btn-notfall">
                Jetzt anrufen →
              </a>
            ) : undefined
          }
        >
          <a href={telHref} className="conversion-btn-primary conversion-btn-primary--inline conversion-btn-notfall">
            Jetzt anrufen →
          </a>
          {produktSlugs.length > 0 ? (
            <>
              <p className="conversion-or">oder online anfragen</p>
              <div className="conversion-picker-panel conversion-picker-panel--open conversion-picker-panel--inline">
                <ProduktPickerCore
                  produktSlugs={produktSlugs}
                  selectedSlug={selectedSlug}
                  onSelect={onSelect}
                  familie="fix"
                  onCheckout={() => setCheckoutOpen(true)}
                  trackQuelle={katalogQuelle}
                />
              </div>
            </>
          ) : null}
        </ConversionWidget>
        {checkoutModal}
      </>
    );
  }

  if (mode.type === "kurzflow" && produktSlugs.length === 0) {
    return (
      <ConversionWidget
        id="konverter"
        eyebrow={copy.eyebrow}
        h2={copy.h2}
        sub={copy.sub}
        footer={
          <Link href={rechnerHref} className="conversion-btn-primary conversion-btn-primary--inline">
            {copy.ctaPrimary}
          </Link>
        }
      />
    );
  }

  if (mode.type !== "paket" && produktSlugs.length === 0) {
    return null;
  }

  return (
    <>
      <ConversionWidget
        id="konverter"
        eyebrow={copy.eyebrow}
        h2={copy.h2}
        sub={copy.sub}
      >
        <div className="conversion-picker-panel conversion-picker-panel--open conversion-picker-panel--inline">
          <ProduktPickerCore
            produktSlugs={produktSlugs}
            selectedSlug={selectedSlug}
            onSelect={onSelect}
            familie={familie}
            onCheckout={() => setCheckoutOpen(true)}
            trackQuelle={katalogQuelle}
          />
        </div>
      </ConversionWidget>
      {checkoutModal}
    </>
  );
}
