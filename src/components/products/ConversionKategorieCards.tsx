"use client";

import { Bath, Trees, Wrench } from "lucide-react";

import {
  formatProduktAbPreis,
  produktFamilieAbPreis,
} from "@/lib/products";
import type { ProduktFamilie } from "@/lib/products/types";

const KATEGORIEN: {
  id: ProduktFamilie;
  label: string;
  subtitle: string;
  icon: typeof Bath;
}[] = [
  { id: "bad", label: "Bad", subtitle: "Komplettsanierung", icon: Bath },
  { id: "fix", label: "Fix", subtitle: "Schnelle Reparatur", icon: Wrench },
  { id: "garten", label: "Garten", subtitle: "Pflege pro Besuch", icon: Trees },
];

type Props = {
  selected: ProduktFamilie;
  onSelect: (id: ProduktFamilie) => void;
};

export function ConversionKategorieCards({ selected, onSelect }: Props) {
  return (
    <div className="conversion-kategorie-grid" role="tablist" aria-label="Projekt wählen">
      {KATEGORIEN.map((kat) => {
        const Icon = kat.icon;
        const ab = produktFamilieAbPreis(kat.id);
        const preisLabel = ab != null ? formatProduktAbPreis(ab) : "Preis auf Anfrage";
        const active = selected === kat.id;

        return (
          <button
            key={kat.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`conversion-kategorie-card${active ? " conversion-kategorie-card--active" : ""}`}
            onClick={() => onSelect(kat.id)}
          >
            <span className="conversion-kategorie-icon" aria-hidden>
              <Icon size={22} strokeWidth={2} />
            </span>
            <span className="conversion-kategorie-label">{kat.label}</span>
            <span className="conversion-kategorie-sub">{kat.subtitle}</span>
            <span className="conversion-kategorie-price">{preisLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
