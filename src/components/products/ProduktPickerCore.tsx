"use client";

import { BadProduktPicker } from "@/components/products/conversion/BadProduktPicker";
import { FixProduktPicker } from "@/components/products/conversion/FixProduktPicker";
import { GartenProduktPicker } from "@/components/products/conversion/GartenProduktPicker";
import { HausserviceProduktPicker } from "@/components/products/conversion/HausserviceProduktPicker";
import type { ProduktFamilie } from "@/lib/products/types";

type Props = {
  produktSlugs: string[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  familie: ProduktFamilie;
  openCheckoutOnSelect?: boolean;
  onCheckout?: () => void;
  trackQuelle?: string;
};

export function ProduktPickerCore({
  produktSlugs,
  selectedSlug,
  onSelect,
  familie,
  openCheckoutOnSelect = true,
  onCheckout,
  trackQuelle = "landing",
}: Props) {
  const shared = {
    produktSlugs,
    selectedSlug,
    onSelect,
    onCheckout,
    openCheckoutOnSelect,
    trackQuelle,
  };

  if (familie === "bad") return <BadProduktPicker {...shared} />;
  if (familie === "hausservice") return <HausserviceProduktPicker {...shared} />;
  if (familie === "garten") return <GartenProduktPicker {...shared} />;
  return <FixProduktPicker {...shared} />;
}
