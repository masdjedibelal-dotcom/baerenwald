"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { track } from "@/lib/analytics";
import { SITE_CONFIG } from "@/lib/config";
import { CTAButton } from "@/components/ui/CTAButton";
import { SiteIcon } from "@/components/ui/SiteIcon";

type KatIconName = "haus" | "werkzeug" | "garten" | "shield" | "blitz";

type CarouselLeistung = {
  slug: string;
  name: string;
  hint: string;
  emoji: string;
  href: string;
  rechnerHref: string;
  /** Optional Foto oben in der Karte (sonst Emoji-Visual). */
  imageSrc?: string;
  imageAlt?: string;
  /** CSS `object-position` für den Ausschnitt im Kartenstreifen. */
  imageObjectPosition?: string;
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
        imageSrc: "/images/leistung-streichen-tapezieren.png",
        imageAlt:
          "Maler in weißem Overall trägt mit der Farbrolle weiße Farbe auf eine Wand auf",
        imageObjectPosition: "55% 28%",
      },
      {
        slug: "badezimmer-sanierung",
        name: "Neues Bad",
        hint: "Komplett erneuern oder einzelne Teile",
        emoji: "🚿",
        href: "/leistungen/badezimmer-sanierung-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-neues-bad.png",
        imageAlt:
          "Bad-Sanierung: Fliesenleger setzt große beige Fliesen; Installateur montiert Anschlüsse unter einem Waschtisch",
        imageObjectPosition: "50% 38%",
      },
      {
        slug: "bodenbelag",
        name: "Neuer Boden",
        hint: "Laminat, Parkett, Fliesen verlegen",
        emoji: "🪵",
        href: "/leistungen/bodenbelag-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-neuer-boden.png",
        imageAlt:
          "Partner verlegt hellen Holzboden, Maßband und Werkzeug liegen auf den Dielen",
        imageObjectPosition: "52% 55%",
      },
      {
        slug: "fenster-tueren",
        name: "Fenster & Türen",
        hint: "Tausch, Reparatur, Abdichten",
        emoji: "🪟",
        href: "/leistungen/fenster-tueren-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-fenster-tueren.png",
        imageAlt:
          "Zwei Partner tauschen ein altes Fenster in einer Wohnung aus",
        imageObjectPosition: "50% 42%",
      },
      {
        slug: "trockenbau",
        name: "Neue Wände & Decken",
        hint: "Zimmer teilen, Decke abhängen",
        emoji: "🏗️",
        href: "/leistungen/trockenbau-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-neue-waende-decken.png",
        imageAlt:
          "Trockenbauer stellt Metallständerwände und montiert Gipskartonplatten für neue Räume",
        imageObjectPosition: "50% 44%",
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
        imageSrc: "/images/leistung-heizung-wasser.png",
        imageAlt:
          "Heizungsmonteur wartet eine Anlage und verlötet Wasserleitungen",
        imageObjectPosition: "50% 42%",
      },
      {
        slug: "elektroarbeiten",
        name: "Strom & Licht",
        hint: "Steckdosen, Sicherungskasten, Elektrik",
        emoji: "⚡",
        href: "/leistungen/elektroarbeiten-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-strom-elektrik.png",
        imageAlt:
          "Zertifizierter Elektriker arbeitet an Stromleitungen und montiert eine Deckenleuchte",
        imageObjectPosition: "50% 38%",
      },
      {
        slug: "dacharbeiten",
        name: "Dach & Regenrinnen",
        hint: "Reparatur, Sanierung, Abdichten",
        emoji: "🏠",
        href: "/leistungen/dacharbeiten-muenchen",
        rechnerHref: "/rechner?situation=erneuern",
        imageSrc: "/images/leistung-dach-regenrinnen.png",
        imageAlt:
          "Dachdecker repariert Dachziegel auf einem Steildach in München",
        imageObjectPosition: "50% 42%",
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
        imageSrc: "/images/leistung-gartenpflege.png",
        imageAlt:
          "Gärtner mäht den Rasen und schneidet eine Hecke vor einem Wohnhaus",
        imageObjectPosition: "50% 44%",
      },
      {
        slug: "gartengestaltung",
        name: "Garten neu gestalten",
        hint: "Terrasse, Wege, Bepflanzung",
        emoji: "🌳",
        href: "/leistungen/gartengestaltung-muenchen",
        rechnerHref: "/rechner?leistung=gartengestaltung",
        imageSrc: "/images/leistung-garten-neu-gestalten.png",
        imageAlt:
          "Partner gestalten einen Garten neu mit Steinplatten, Wegen und sauberem Unterbau",
        imageObjectPosition: "50% 46%",
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
        imageSrc: "/images/leistung-hausmeisterservice.png",
        imageAlt:
          "Hausmeister kontrolliert Treppenhaus, schneidet Hecken und kümmert sich um die Außenanlage",
        imageObjectPosition: "50% 44%",
      },
      {
        slug: "gebauedereinigung",
        name: "Gebäudereinigung",
        hint: "Treppenhaus, Gemeinschaftsflächen, regelmäßig oder einmalig",
        emoji: "🧹",
        href: "/leistungen/hausmeisterservice-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
        imageSrc: "/images/leistung-gebaeudereinigung.png",
        imageAlt:
          "Reinigungskraft säubert Treppenhaus und Glasflächen im Eingangsbereich eines Wohngebäudes",
        imageObjectPosition: "50% 44%",
      },
      {
        slug: "wartung",
        name: "Wartung & Pflege",
        hint: "Heizungswartung, Lüftung, regelmäßige Kontrollen",
        emoji: "🔩",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
        imageSrc: "/images/leistung-wartung-pflege.png",
        imageAlt:
          "Techniker wartet Heizungs- und Lüftungsanlage und prüft die Komponenten im Keller",
        imageObjectPosition: "50% 44%",
      },
      {
        slug: "winterdienst-service",
        name: "Winterdienst",
        hint: "Räumen und Streuen — Streupflicht übernehmen wir",
        emoji: "❄️",
        href: "/leistungen/winterdienst-muenchen",
        rechnerHref: "/rechner?situation=betreuung",
        imageSrc: "/images/leistung-winterdienst.png",
        imageAlt:
          "Winterdienst räumt Gehweg und Straße mit einer Schneefräse in einem Wohngebiet",
        imageObjectPosition: "50% 44%",
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
        rechnerHref: "/rechner?situation=kaputt",
        imageSrc: "/images/leistung-heizung-ausgefallen.png",
        imageAlt:
          "Moderne Heizkörperanlage in Wohnraum als Visual für Heizungsausfall-Notdienst",
        imageObjectPosition: "50% 42%",
      },
      {
        slug: "wasser-notfall",
        name: "Rohrbruch / Leck",
        hint: "Soforteinsatz — Haupthahn schließen",
        emoji: "💧",
        href: "/leistungen/heizung-sanitaer-muenchen",
        rechnerHref: "/rechner?situation=kaputt",
        imageSrc: "/images/leistung-heizung-wasser.png",
        imageAlt:
          "Heizungsmonteur wartet eine Anlage und verlötet Wasserleitungen",
        imageObjectPosition: "50% 42%",
      },
      {
        slug: "elektro-notfall",
        name: "Strom weg",
        hint: "Zertifizierter Elektrobetrieb",
        emoji: "⚡",
        href: "/leistungen/elektroarbeiten-muenchen",
        rechnerHref: "/rechner?situation=kaputt",
        imageSrc: "/images/leistung-strom-weg.png",
        imageAlt:
          "Elektriker prüft bei Stromausfall den Sicherungskasten im dunklen Flur",
        imageObjectPosition: "50% 42%",
      },
    ],
  },
];

function KatIcon({ name }: { name: KatIconName }) {
  const map = {
    haus: "home",
    werkzeug: "wrench",
    garten: "trees",
    shield: "shield-check",
    blitz: "zap",
  } as const;
  return <SiteIcon n={map[name]} ctx="default" size={22} aria-hidden />;
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
            <SiteIcon n="chevron-left" ctx="default" size={18} aria-hidden />
          </button>

          <div
            ref={cardsRef}
            className={`leistungen-cards${isDragging ? " dragging" : ""}`}
            onMouseDown={onCardsMouseDown}
            onMouseLeave={() => setIsDragging(false)}
            onClickCapture={onCardClickCapture}
          >
            {kat.leistungen.map((l) => {
              return (
              <div key={l.slug} className="leistung-card">
                <div
                  className={`leistung-card-visual${l.imageSrc ? " leistung-card-visual--photo" : ""}`}
                  style={{
                    position: "relative",
                    height: 140,
                    overflow: "hidden",
                  }}
                >
                  {l.imageSrc ? (
                    <Image
                      src={l.imageSrc}
                      alt={l.imageAlt ?? l.name}
                      fill
                      sizes="280px"
                      className="leistung-card-photo-img"
                      style={
                        l.imageObjectPosition
                          ? { objectPosition: l.imageObjectPosition }
                          : undefined
                      }
                      priority={l.slug === "malerarbeiten"}
                    />
                  ) : (
                    <>
                      <span className="leistung-card-visual-icon">
                        {l.emoji}
                      </span>
                      <span className="leistung-card-visual-bg" aria-hidden>
                        {l.emoji}
                      </span>
                    </>
                  )}
                </div>
                <div className="leistung-card-body">
                  <div className="leistung-card-cat">{kat.label}</div>
                  <div className="leistung-card-name">{l.name}</div>
                  <p className="leistung-card-hint">{l.hint}</p>
                  <div className="leistung-card-cta">
                    <CTAButton
                      bare
                      href={l.href}
                      tone="card-link"
                      label="Mehr Infos"
                      onClick={() => track.leistungLink(`${l.name} — Infos`, l.href)}
                    />
                    <Link
                      href={l.href}
                      className="leistung-card-cta-arrow"
                      title="Mehr Infos →"
                      onClick={() =>
                        track.leistungLink(`${l.name} — Infos`, l.href)
                      }
                    >
                      <SiteIcon n="arrow-right" ctx="default" size={12} aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            );
            })}

            <Link
              href="/kontakt"
              className="leistung-card leistung-card--more"
            >
              <div className="leistung-card-visual leistung-card-visual--more">
                <span className="leistung-card-visual-icon">→</span>
              </div>
              <div className="leistung-card-body">
                <div className="leistung-card-name">Kontakt aufnehmen</div>
                <p className="leistung-card-hint">
                  Beschreib einfach kurz dein Vorhaben
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
            <SiteIcon n="chevron-right" ctx="default" size={18} aria-hidden />
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
