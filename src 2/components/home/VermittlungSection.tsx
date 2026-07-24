"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const VERMITTLUNG_EMAIL = "info@baerenwaldmuenchen.de";

const VERMITTLUNG_KARTEN = [
  {
    eyebrow: "Sie suchen",
    titel: "Versicherungsschutz",
    text: "Wohngebäude, Hausrat oder Bauherren-Haftpflicht — wir vermitteln den richtigen Berater aus unserem Netzwerk.",
    cta: "Anfrage stellen →",
    mailtoSubject: "Vermittlung Versicherung",
  },
  {
    eyebrow: "Sie suchen",
    titel: "Projektfinanzierung",
    text: "Renovierungskredit oder KfW-Förderung — wir finden die passende Finanzierungslösung für Ihr Projekt.",
    cta: "Anfrage stellen →",
    mailtoSubject: "Vermittlung Finanzierung",
  },
  {
    eyebrow: "Sie suchen",
    titel: "Immobilienmakler",
    text: "Kaufen, verkaufen oder vermieten in München — wir vermitteln erfahrene Makler aus unserem Netzwerk.",
    cta: "Anfrage stellen →",
    mailtoSubject: "Vermittlung Makler",
  },
  {
    eyebrow: "Sie suchen",
    titel: "Energieberatung",
    text: "KfW und BAFA Förderung, Wärmepumpe oder Dämmung — wir vermitteln zertifizierte Energieberater.",
    cta: "Anfrage stellen →",
    mailtoSubject: "Vermittlung Energieberatung",
  },
  {
    eyebrow: "Sie suchen",
    titel: "Hausverwaltung",
    text: "Professionelle Verwaltung für Ihr Objekt in München — wir vermitteln kompetente Hausverwaltungen.",
    cta: "Anfrage stellen →",
    mailtoSubject: "Vermittlung Hausverwaltung",
  },
] as const;

function vermittlungMailtoHref(subject: string): string {
  const params = new URLSearchParams({
    subject,
    body: "Ich interessiere mich für eine Vermittlung.",
  });
  return `mailto:${VERMITTLUNG_EMAIL}?${params.toString()}`;
}

const PARTNER_MAILTO = `mailto:${VERMITTLUNG_EMAIL}?${new URLSearchParams({
  subject: "Partneranfrage",
  body: "Ich möchte als Handwerks- oder Partnerbetrieb in der Region München mit Bärenwald zusammenarbeiten.",
}).toString()}`;

function VermittlungCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const x = el.scrollLeft;
    let bestI = 0;
    let bestDist = Infinity;
    const cards = el.querySelectorAll<HTMLElement>("[data-vermittlung-index]");
    cards.forEach((card) => {
      const idx = Number(card.dataset.vermittlungIndex);
      if (Number.isNaN(idx)) return;
      const d = Math.abs(card.offsetLeft - x);
      if (d < bestDist) {
        bestDist = d;
        bestI = idx;
      }
    });
    setActiveIndex(bestI);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => {
      requestAnimationFrame(updateActiveFromScroll);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    updateActiveFromScroll();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateActiveFromScroll);
    });
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateActiveFromScroll]);

  const scrollToIndex = useCallback((index: number) => {
    const root = trackRef.current;
    const card = root?.querySelector(
      `[data-vermittlung-index="${index}"]`
    ) as HTMLElement | null;
    if (!root || !card) return;
    const targetLeft = card.offsetLeft;
    const maxScroll = Math.max(0, root.scrollWidth - root.clientWidth);
    root.scrollTo({
      left: Math.min(maxScroll, Math.max(0, targetLeft)),
      behavior: "smooth",
    });
    setActiveIndex(index);
  }, []);

  return (
    <div className="vermittlung-carousel">
      <div className="vermittlung-carousel-wrap">
        <div ref={trackRef} className="vermittlung-carousel-track">
          {VERMITTLUNG_KARTEN.map((karte, index) => (
            <a
              key={karte.mailtoSubject}
              href={vermittlungMailtoHref(karte.mailtoSubject)}
              className="vermittlung-card"
              data-vermittlung-index={index}
            >
              <p className="vermittlung-card-eyebrow">{karte.eyebrow}</p>
              <h3 className="vermittlung-card-title">{karte.titel}</h3>
              <p className="vermittlung-card-text">{karte.text}</p>
              <span className="vermittlung-card-cta">{karte.cta}</span>
            </a>
          ))}
        </div>
      </div>
      <div
        className="vermittlung-dots"
        role="tablist"
        aria-label="Vermittlung-Karten"
      >
        {VERMITTLUNG_KARTEN.map((karte, index) => (
          <button
            key={karte.mailtoSubject}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-label={`${karte.titel}`}
            className={cn(
              "vermittlung-dot",
              activeIndex === index && "vermittlung-dot--active"
            )}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}

export function VermittlungSection() {
  return (
    <>
      <section
        className="vermittlung-section"
        aria-labelledby="vermittlung-heading"
      >
        <div className="vermittlung-section-inner">
          <h2 id="vermittlung-heading" className="vermittlung-heading">
            Mehr als nur Handwerk.
          </h2>
          <p className="vermittlung-subline">
            Aus unserem Partnernetzwerk
            <br />
            vermitteln wir die richtigen
            <br />
            Berater — einfach anfragen.
          </p>
          <VermittlungCarousel />

          <div
            className="vermittlung-partner-cta"
            aria-labelledby="vermittlung-partner-heading"
          >
            <p className="vermittlung-partner-cta-eyebrow">Partner-Netzwerk</p>
            <h3
              id="vermittlung-partner-heading"
              className="vermittlung-partner-cta-question"
            >
              Passen Sie als Handwerks- oder Partnerbetrieb zu unserem Netzwerk?
            </h3>
            <p className="vermittlung-partner-cta-text">
              Wir arbeiten mit zuverlässigen Meisterbetrieben und weiteren
              Partnern in München zusammen — etwa Handwerk, Planung, Service
              oder verwandte Gewerke. Melden Sie sich gern unverbindlich.
            </p>
            <a href={PARTNER_MAILTO} className="vermittlung-partner-cta-btn">
              Kontakt aufnehmen →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
