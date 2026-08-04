"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  formatProduktPreisRange,
  produktPreis,
} from "@/lib/products";

type Props = {
  onCheckout: () => void;
  ctaPrimary: string;
  ctaSecondary: string;
  rechnerHref: string;
};

export function ConversionWidgetActions({
  onCheckout,
  ctaPrimary,
  ctaSecondary,
  rechnerHref,
}: Props) {
  return (
    <div className="conversion-actions conversion-actions--bar">
      <button type="button" className="conversion-btn-primary" onClick={onCheckout}>
        {ctaPrimary}
      </button>
      <Link href={rechnerHref} className="conversion-btn-secondary">
        {ctaSecondary}
      </Link>
    </div>
  );
}

export function ConversionWidgetStickyBar({
  selectedSlug,
  onCheckout,
  label = "Anfragen",
}: {
  selectedSlug: string;
  onCheckout: () => void;
  label?: string;
}) {
  const preis = useMemo(() => produktPreis(selectedSlug), [selectedSlug]);

  const preisLabel =
    preis && preis.min > 0 ? formatProduktPreisRange(preis.min, preis.max) : "—";

  return (
    <div className="conversion-sticky-bar">
      <div className="conversion-sticky-inner">
        <span className="conversion-sticky-price">{preisLabel}</span>
        <button type="button" className="conversion-sticky-cta" onClick={onCheckout}>
          {label}
        </button>
      </div>
    </div>
  );
}
