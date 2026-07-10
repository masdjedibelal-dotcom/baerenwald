"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";

import {
  GARTEN_GROESSE_LABELS,
  HAUSSERVICE_EMPFOHLEN_STUFE,
  HAUSSERVICE_STUFE_LABELS,
  HAUSSERVICE_STUFE_TAGLINES,
  PAKET_EMPFOHLEN_GROESSE,
  PAKET_EMPFOHLEN_STUFE,
  PAKET_STUFE_LABELS,
  PAKET_STUFE_TAGLINES,
} from "@/lib/leistungen/converter-copy";
import { getCardDisplay } from "@/lib/products/card-highlights";
import { GARTEN_GROESSE_QM } from "@/lib/products/garten-feature-matrix";
import {
  formatGartenMonatPreis,
  formatProduktPreisRange,
  produktPreis,
} from "@/lib/products/produkt-preis";
import type { ProduktFunnelOverrides } from "@/lib/products/produkt-to-funnel";
import type { HausserviceStufe, Produkt, ProduktFamilie } from "@/lib/products/types";

type BadgeKind = "beliebt" | "premium" | "gewerk" | null;

function fixGewerkLabel(produkt: Produkt): string {
  if (produkt.bereiche.includes("heizung")) return "Heizung";
  if (produkt.bereiche.includes("elektro")) return "Elektro";
  if (produkt.bereiche.includes("sanitaer")) return "Sanitär";
  return "Handwerk";
}

function cardBadge(produkt: Produkt, familie: ProduktFamilie): BadgeKind {
  if (familie === "fix") return "gewerk";
  if (familie === "bad" && produkt.stufe === PAKET_EMPFOHLEN_STUFE) return "beliebt";
  if (familie === "bad" && produkt.stufe === "gehoben") return "premium";
  if (
    familie === "hausservice" &&
    produkt.stufe === HAUSSERVICE_EMPFOHLEN_STUFE
  ) {
    return "beliebt";
  }
  if (familie === "garten" && produkt.groesse === PAKET_EMPFOHLEN_GROESSE) return "beliebt";
  return null;
}

function cardTitle(produkt: Produkt, familie: ProduktFamilie): string {
  if (familie === "bad" && produkt.stufe) {
    return PAKET_STUFE_LABELS[produkt.stufe as keyof typeof PAKET_STUFE_LABELS];
  }
  if (familie === "hausservice" && produkt.stufe) {
    return HAUSSERVICE_STUFE_LABELS[produkt.stufe as HausserviceStufe];
  }
  if (familie === "garten" && produkt.groesse) {
    return `Garten ${GARTEN_GROESSE_LABELS[produkt.groesse].label}`;
  }
  return produkt.titel;
}

function cardTagline(produkt: Produkt, familie: ProduktFamilie): string {
  if (familie === "bad" && produkt.stufe) {
    return PAKET_STUFE_TAGLINES[produkt.stufe as keyof typeof PAKET_STUFE_TAGLINES];
  }
  if (familie === "hausservice" && produkt.stufe) {
    return HAUSSERVICE_STUFE_TAGLINES[produkt.stufe as HausserviceStufe];
  }
  if (familie === "garten" && produkt.groesse) {
    return `${GARTEN_GROESSE_LABELS[produkt.groesse].hint} · Saison-Abo 2×/Monat`;
  }
  return produkt.kurz;
}

function isFeatured(produkt: Produkt, familie: ProduktFamilie): boolean {
  if (familie === "bad") return produkt.stufe === PAKET_EMPFOHLEN_STUFE;
  if (familie === "hausservice") {
    return produkt.stufe === HAUSSERVICE_EMPFOHLEN_STUFE;
  }
  if (familie === "garten") return produkt.groesse === PAKET_EMPFOHLEN_GROESSE;
  return false;
}

type Props = {
  produkt: Produkt;
  familie: ProduktFamilie;
  selected: boolean;
  onActivate: (slug: string) => void;
  onCta?: (slug: string) => void;
  hideGewerkBadge?: boolean;
  priceOverrides?: ProduktFunnelOverrides;
};

export function PlanCard({
  produkt,
  familie,
  selected,
  onActivate,
  onCta,
  hideGewerkBadge = false,
  priceOverrides,
}: Props) {
  const preis = useMemo(
    () => produktPreis(produkt.slug, priceOverrides),
    [produkt.slug, priceOverrides]
  );
  const preisLabel = useMemo(() => {
    if (!preis || preis.min <= 0) return "—";
    if (familie === "garten" || familie === "hausservice") {
      return formatGartenMonatPreis(preis.min, preis.max);
    }
    return formatProduktPreisRange(preis.min, preis.max);
  }, [preis, familie]);
  const featured = isFeatured(produkt, familie);
  const badge = cardBadge(produkt, familie);
  const { bullets } = useMemo(
    () => getCardDisplay(produkt, familie),
    [produkt, familie]
  );

  const areaHint =
    familie === "garten" && produkt.groesse
      ? `ca. ${produkt.groesseQm ?? GARTEN_GROESSE_QM[produkt.groesse]} m²`
      : null;

  function selectCard() {
    onActivate(produkt.slug);
  }

  function submitCard(e?: React.MouseEvent) {
    e?.stopPropagation();
    (onCta ?? onActivate)(produkt.slug);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onCta && selected) submitCard();
      else selectCard();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      className={`conversion-plan-card${selected ? " conversion-plan-card--selected" : ""}${featured ? " conversion-plan-card--featured" : ""}`}
      onClick={selectCard}
      onKeyDown={onKeyDown}
      aria-pressed={selected}
    >
      {badge === "gewerk" && !hideGewerkBadge ? (
        <span className="conversion-plan-badge conversion-plan-badge--gewerk">
          {fixGewerkLabel(produkt)}
        </span>
      ) : badge === "beliebt" ? (
        <span className="conversion-plan-badge">Empfohlen</span>
      ) : badge === "premium" ? (
        <span className="conversion-plan-badge conversion-plan-badge--premium">Premium</span>
      ) : null}

      <div className="conversion-plan-card-body">
        <p className="conversion-plan-name">{cardTitle(produkt, familie)}</p>
        <p className="conversion-plan-tagline">{cardTagline(produkt, familie)}</p>

        <div className="conversion-plan-price-block">
          <p className="conversion-plan-price">{preisLabel}</p>
          {areaHint ? <p className="conversion-plan-area-hint">{areaHint}</p> : null}
          <p className="conversion-plan-price-hint">
            {familie === "garten"
              ? "Saison-Abo · Apr–Okt"
              : familie === "hausservice"
                ? "pro Monat · nach Objektgröße"
                : "Festpreis nach Besichtigung"}
          </p>
        </div>

        <ul className="conversion-plan-features" aria-label="Highlights">
          {bullets.map((text) => (
            <li key={text}>
              <Check size={14} strokeWidth={2.5} aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="conversion-plan-cta"
        onClick={submitCard}
      >
        Anfragen
      </button>
    </article>
  );
}
