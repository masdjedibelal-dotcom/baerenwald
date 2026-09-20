"use client";

import { useMemo } from "react";

import { CTAButton } from "@/components/ui/CTAButton";
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
      <CTAButton bare tone="conversion" type="button" onClick={onCheckout} label={ctaPrimary} />
      <CTAButton bare tone="conversion-secondary" href={rechnerHref} label={ctaSecondary} />
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
        <CTAButton bare tone="conversion-sticky" type="button" onClick={onCheckout} label={label} />
      </div>
    </div>
  );
}
