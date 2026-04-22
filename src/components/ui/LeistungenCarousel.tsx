"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { SITE_CONFIG } from "@/lib/config";

type KatIconName = "haus" | "werkzeug" | "garten" | "shield" | "blitz";

type CarouselLeistung = {
  slug: string;
  name: string;
  hint: string;
  emoji: string;
  href: string;
  rechnerHref: string;
};

type Kategorie = {
  id: string;
  label: string;
  icon: KatIconName;
  leistungen: CarouselLeistung[];
};

const KATEGORIEN: Kategorie[] = [
  {
    id: "wohnraum_erneuern",
    label: "Renovieren",
    icon: "haus",
    leistungen: [
      {
        slug: "malerarbeiten",
        name: "Streichen & Tapezieren",
        hint: "Frische Farbe für Wände und Decken",
        emoji: "🖌️",
        href: "/leistungen/malerarbeiten-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "badezimmer-sanierung",
        name: "Neues Bad",
        hint: "Komplett erneuern oder einzelne Teile",
        emoji: "🚿",
        href: "/leistungen/badezimmer-sanierung-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "bodenbelag",
        name: "Neuer Boden",
        hint: "Laminat, Parkett, Fliesen verlegen",
        emoji: "🪵",
        href: "/leistungen/bodenbelag-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "fenster-tueren",
        name: "Fenster & Türen",
        hint: "Tausch, Reparatur, Abdichten",
        emoji: "🪟",
        href: "/leistungen/fenster-tueren-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "trockenbau",
        name: "Neue Wände & Decken",
        hint: "Zimmer teilen, Decke abhängen",
        emoji: "🏗️",
        href: "/leistungen/trockenbau-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
    ],
  },
  {
    id: "technik_erneuern",
    label: "Sanieren",
    icon: "werkzeug",
    leistungen: [
      {
        slug: "heizung-sanitaer",
        name: "Heizung & Wasser",
        hint: "Heizung tauschen, Rohre reparieren",
        emoji: "🔧",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "elektroarbeiten",
        name: "Strom & Licht",
        hint: "Steckdosen, Sicherungskasten, Elektrik",
        emoji: "⚡",
        href: "/leistungen/elektroarbeiten-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
      {
        slug: "dacharbeiten",
        name: "Dach & Regenrinnen",
        hint: "Reparatur, Sanierung, Abdichten",
        emoji: "🏠",
        href: "/leistungen/dacharbeiten-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
      },
    ],
  },
  {
    id: "garten",
    label: "Garten & Außen",
    icon: "garten",
    leistungen: [
      {
        slug: "gartenpflege",
        name: "Gartenpflege",
        hint: "Mähen, Schneiden, Aufräumen",
        emoji: "🌿",
        href: "/leistungen/gartenpflege-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
      },
      {
        slug: "gartengestaltung",
        name: "Garten neu gestalten",
        hint: "Terrasse, Wege, Bepflanzung",
        emoji: "🌳",
        href: "/leistungen/gartengestaltung-muenchen",
        rechnerHref: "/rechner?situation=neubauen",
      },
    ],
  },
  {
    id: "service",
    label: "Service & Betreuung",
    icon: "shield",
    leistungen: [
      {
        slug: "hausmeisterservice",
        name: "Hausmeisterservice",
        hint: "Alles aus einer Hand — regelmäßig",
        emoji: "🏡",
        href: "/leistungen/hausmeisterservice-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
      },
      {
        slug: "gebauedereinigung",
        name: "Gebäudereinigung",
        hint: "Treppenhaus, Gemeinschaftsflächen, regelmäßig oder einmalig",
        emoji: "🧹",
        href: "/leistungen/hausmeisterservice-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
      },
      {
        slug: "wartung",
        name: "Wartung & Pflege",
        hint: "Heizungswartung, Lüftung, regelmäßige Kontrollen",
        emoji: "🔩",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
      },
      {
        slug: "winterdienst-service",
        name: "Winterdienst",
        hint: "Räumen und Streuen — Streupflicht übernehmen wir",
        emoji: "❄️",
        href: "/leistungen/winterdienst-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
      },
    ],
  },
  {
    id: "notfall",
    label: "Notfall",
    icon: "blitz",
    leistungen: [
      {
        slug: "heizung-sanitaer-notfall",
        name: "Heizung ausgefallen",
        hint: "Schnell vor Ort — auch kurzfristig",
        emoji: "🔥",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=notfall",
      },
      {
        slug: "wasser-notfall",
        name: "Rohrbruch / Leck",
        hint: "Soforteinsatz — Haupthahn schließen",
        emoji: "💧",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=notfall",
      },
      {
        slug: "elektro-notfall",
        name: "Strom weg",
        hint: "Zertifizierter Elektrobetrieb",
        emoji: "⚡",
        href: "/leistungen/elektroarbeiten-muenchen",
        rechnerHref: "/rechner?situation=notfall",
      },
    ],
  },
];

function KatIcon({ name }: { name: KatIconName }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "haus") {
    return (
      <svg {...p} aria-hidden>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    );
  }
  if (name === "werkzeug") {
    return (
      <svg {...p} aria-hidden>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />
      </svg>
    );
  }
  if (name === "garten") {
    return (
      <svg {...p} aria-hidden>
        <path d="M12 22V12" />
        <path d="M12 12c0-5-5-8-10-7 1 5 4 8 10 7" />
        <path d="M12 12c0-5 5-8 10-7-1 5-4 8-10 7" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...p} aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg {...p} aria-hidden>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function LeistungenCarousel() {
  const [activeKat, setActiveKat] = useState(KATEGORIEN[0]!.id);
  const [isDragging, setIsDragging] = useState(false);

  const cardsRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const kat = useMemo(
    () => KATEGORIEN.find((k) => k.id === activeKat) ?? KATEGORIEN[0]!,
    [activeKat]
  );

  const telHref = `tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`;

  const scrollByDir = useCallback((dir: "left" | "right") => {
    cardsRef.current?.scrollBy({
      left: dir === "right" ? 280 : -280,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = cardsRef.current;
    if (el) el.scrollLeft = 0;
  }, [activeKat]);

  const onCardsMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !cardsRef.current) return;
    setIsDragging(true);
    dragMoved.current = false;
    dragStartX.current = e.pageX;
    dragScrollLeft.current = cardsRef.current.scrollLeft;
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!cardsRef.current) return;
      const dx = e.pageX - dragStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      cardsRef.current.scrollLeft = dragScrollLeft.current - dx;
    };

    const onUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const onCardClickCapture = (e: ReactMouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved.current = false;
    }
  };

  const isNotfall = activeKat === "notfall";

  return (
    <section className="leistungen-section" id="leistungen">
      <div className="leistungen-inner">
        <div className="leistungen-header">
          <div className="section-eyebrow">Was wir machen</div>
          <h2 className="section-h2">Alle Leistungen aus einer Hand</h2>
          <p className="checks-section-tagline">
            Wähle eine Kategorie — oder starte direkt den Preisrechner.
          </p>
        </div>

        <div className="kat-tabs" role="tablist" aria-label="Leistungskategorien">
          {KATEGORIEN.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={activeKat === k.id}
              id={`kat-tab-${k.id}`}
              className={`kat-tab${activeKat === k.id ? " active" : ""}`}
              onClick={() => setActiveKat(k.id)}
            >
              <span className="kat-tab-icon">
                <KatIcon name={k.icon} />
              </span>
              {k.label}
            </button>
          ))}
        </div>

        <div className="leistungen-cards-wrap">
          <button
            type="button"
            className="carousel-arrow carousel-arrow--left"
            onClick={() => scrollByDir("left")}
            aria-label="Zurück"
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M11 4 6 9l5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            ref={cardsRef}
            className={`leistungen-cards${isDragging ? " dragging" : ""}`}
            onMouseDown={onCardsMouseDown}
            onMouseLeave={() => setIsDragging(false)}
            onClickCapture={onCardClickCapture}
          >
            {kat.leistungen.map((l) => (
              <div key={l.slug} className="leistung-card">
                <div className="leistung-card-visual">
                  <span className="leistung-card-visual-icon">{l.emoji}</span>
                  <span className="leistung-card-visual-bg" aria-hidden>
                    {l.emoji}
                  </span>
                </div>
                <div className="leistung-card-body">
                  <div className="leistung-card-cat">{kat.label}</div>
                  <div className="leistung-card-name">{l.name}</div>
                  <p className="leistung-card-hint">{l.hint}</p>
                  <div className="leistung-card-cta">
                    <Link href={l.href} className="leistung-card-cta-link">
                      Mehr Infos
                    </Link>
                    <Link
                      href={l.rechnerHref}
                      className="leistung-card-cta-arrow"
                      title="Preisrahmen berechnen →"
                    >
                      <svg viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2 6h8M7 3l3 3-3 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/rechner"
              className="leistung-card leistung-card--more"
            >
              <div className="leistung-card-visual leistung-card-visual--more">
                <span className="leistung-card-visual-icon">→</span>
              </div>
              <div className="leistung-card-body">
                <div className="leistung-card-name">Direkt anfragen</div>
                <p className="leistung-card-hint">
                  Beschreib einfach was du brauchst
                </p>
              </div>
            </Link>
          </div>

          <button
            type="button"
            className="carousel-arrow carousel-arrow--right"
            onClick={() => scrollByDir("right")}
            aria-label="Weiter"
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M7 4l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {isNotfall ? (
          <div className="leistungen-notfall-banner">
            <div>
              <div className="leistungen-notfall-banner-title">
                Akuter Notfall?
              </div>
              <div className="leistungen-notfall-banner-text">
                Ruf uns direkt an — wir sind Mo–Sa 7–20 Uhr erreichbar.
              </div>
            </div>
            <a href={telHref} className="leistungen-notfall-banner-cta">
              Jetzt anrufen →
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
