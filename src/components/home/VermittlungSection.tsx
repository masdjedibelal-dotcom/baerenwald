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
  body: "Ich bin Handwerksbetrieb in München und möchte Partner bei Bärenwald werden.",
}).toString()}`;

function VermittlungCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const root = trackRef.current;
    const card = root?.querySelector(
      `[data-vermittlung-index="${index}"]`
    ) as HTMLElement | null;
    card?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;

    const cards = root.querySelectorAll<HTMLElement>(
      "[data-vermittlung-index]"
    );
    if (cards.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestIndex: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number(
            (entry.target as HTMLElement).dataset.vermittlungIndex
          );
          if (Number.isNaN(idx)) continue;
          if (entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        }
        if (bestIndex !== null) {
          setActiveIndex(bestIndex);
        }
      },
      {
        root,
        threshold: [0.35, 0.5, 0.65, 0.85, 1],
      }
    );

    cards.forEach((card) => io.observe(card));
    return () => io.disconnect();
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
        </div>
      </section>

      <section
        className="vermittlung-partner"
        aria-labelledby="vermittlung-partner-heading"
      >
        <p className="vermittlung-partner-eyebrow">Für Handwerksbetriebe</p>
        <h2 id="vermittlung-partner-heading" className="vermittlung-partner-title">
          Sie sind Handwerker
          <br />
          und wollen mit uns
          <br />
          zusammenarbeiten?
        </h2>
        <p className="vermittlung-partner-text">
          Wir suchen zuverlässige Meisterbetriebe in München für unser Netzwerk
          — meld dich einfach bei uns.
        </p>
        <a href={PARTNER_MAILTO} className="vermittlung-partner-btn">
          Jetzt Kontakt aufnehmen →
        </a>
      </section>
    </>
  );
}
