"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

export const PROJEKTE = [
  {
    id: 1,
    bild: "/images/projekt-bad-schwabing.jpg",
    bildAlt: "Renoviertes Badezimmer in Schwabing München",
    gewerk: "Bad Renovierung",
    stadtteil: "Schwabing",
    jahr: "2024",
    beschreibung:
      "Komplette Badsanierung inkl. neue Fliesen, Sanitärobjekte und Elektro — alles aus einer Hand.",
    emoji: "🚿",
  },
  {
    id: 2,
    bild: "/images/projekt-wohnung-maxvorstadt.jpg",
    bildAlt: "Renovierte Wohnung in der Maxvorstadt München",
    gewerk: "Wohnungsrenovierung",
    stadtteil: "Maxvorstadt",
    jahr: "2024",
    beschreibung:
      "Wände, Böden und Decken komplett erneuert — Maler, Bodenleger und Elektriker koordiniert in 10 Tagen.",
    emoji: "🏠",
  },
  {
    id: 3,
    bild: "/images/projekt-garten-bogenhausen.jpg",
    bildAlt: "Neugestalteter Garten in Bogenhausen München",
    gewerk: "Gartengestaltung",
    stadtteil: "Bogenhausen",
    jahr: "2024",
    beschreibung:
      "Neuer Rasen, Terrassenpflaster und Bepflanzung — fertig in einer Woche.",
    emoji: "🌿",
  },
  {
    id: 4,
    bild: "/images/projekt-kueche-haidhausen.jpg",
    bildAlt: "Neue Küche in Haidhausen München",
    gewerk: "Küche & Boden",
    stadtteil: "Haidhausen",
    jahr: "2023",
    beschreibung:
      "Küchenmontage, neuer Vinylboden und frischer Anstrich — ein Ansprechpartner, eine Rechnung.",
    emoji: "🍳",
  },
  {
    id: 5,
    bild: "/images/projekt-heizung-pasing.jpg",
    bildAlt: "Neue Heizungsanlage in Pasing München",
    gewerk: "Heizungssanierung",
    stadtteil: "Pasing",
    jahr: "2023",
    beschreibung:
      "Alte Gasheizung gegen neue Anlage getauscht — inklusive Förderberatung und Abnahmeprotokoll.",
    emoji: "🔥",
  },
  {
    id: 6,
    bild: "/images/projekt-dachgeschoss-schwabing.jpg",
    bildAlt: "Ausgebautes Dachgeschoss in Schwabing München",
    gewerk: "Dachgeschoss Ausbau",
    stadtteil: "Schwabing",
    jahr: "2023",
    beschreibung:
      "Kompletter DG-Ausbau mit Trockenbau, Elektro, Boden und Malerarbeiten — schlüsselfertig übergeben.",
    emoji: "🏗️",
  },
] as const;

const SCROLL_STEP = 376;

function ProjektBild({
  src,
  alt,
  emoji,
}: {
  src: string;
  alt: string;
  emoji: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="projekt-placeholder">
        <span className="projekt-placeholder-emoji" aria-hidden>
          {emoji}
        </span>
        <span className="projekt-placeholder-text">[Foto folgt]</span>
      </div>
    );
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        className="projekt-bild"
        sizes="(max-width: 680px) 85vw, 380px"
        onError={() => setFailed(true)}
      />
      <div className="projekt-bild-gradient" aria-hidden />
    </>
  );
}

export function ProjektGalerie() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const updateActiveFromScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cx = el.scrollLeft + el.clientWidth / 2;
    let bestI = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const mid = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(mid - cx);
      if (d < bestDist) {
        bestDist = d;
        bestI = i;
      }
    });
    setActiveIndex(bestI);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      requestAnimationFrame(updateActiveFromScroll);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    updateActiveFromScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateActiveFromScroll]);

  const scrollByDir = useCallback((dir: "left" | "right") => {
    carouselRef.current?.scrollBy({
      left: dir === "right" ? SCROLL_STEP : -SCROLL_STEP,
      behavior: "smooth",
    });
  }, []);

  const scrollToIndex = useCallback((i: number) => {
    const root = carouselRef.current;
    if (!root?.children[i]) return;
    const card = root.children[i] as HTMLElement;
    root.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActiveIndex(i);
  }, []);

  const onCarouselMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !carouselRef.current) return;
    setIsDragging(true);
    dragMoved.current = false;
    dragStartX.current = e.pageX;
    dragScrollLeft.current = carouselRef.current.scrollLeft;
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!carouselRef.current) return;
      const dx = e.pageX - dragStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      carouselRef.current.scrollLeft = dragScrollLeft.current - dx;
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

  const onCarouselClickCapture = (e: ReactMouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved.current = false;
    }
  };

  return (
    <section className="projekte-section" aria-labelledby="projekte-heading">
      <div className="projekte-inner">
        <div className="projekte-header fade-up">
          <span className="section-eyebrow">Unsere Projekte</span>
          <h2 id="projekte-heading" className="section-h2">
            Echte Projekte.
            <br />
            Echte Ergebnisse.
          </h2>
          <p className="section-sub">
            Alle Projekte in München und Umgebung — koordiniert, pünktlich,
            sauber übergeben.
          </p>
        </div>

        <div className="projekte-carousel-wrap">
          <button
            type="button"
            className="carousel-arrow carousel-arrow--left"
            onClick={() => scrollByDir("left")}
            aria-label="Vorherige Projekte"
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
            ref={carouselRef}
            className={`projekte-carousel${isDragging ? " dragging" : ""}`}
            onMouseDown={onCarouselMouseDown}
            onMouseLeave={() => setIsDragging(false)}
            onClickCapture={onCarouselClickCapture}
          >
            {PROJEKTE.map((projekt, i) => (
              <div
                key={projekt.id}
                className="projekt-card fade-up"
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                <div className="projekt-bild-wrap">
                  <ProjektBild
                    src={projekt.bild}
                    alt={projekt.bildAlt}
                    emoji={projekt.emoji}
                  />
                </div>
                <div className="projekt-info">
                  <div className="projekt-meta">
                    <span className="projekt-gewerk">{projekt.gewerk}</span>
                    <span className="projekt-meta-dot" aria-hidden>
                      ·
                    </span>
                    <span className="projekt-stadtteil">{projekt.stadtteil}</span>
                    <span className="projekt-meta-dot" aria-hidden>
                      ·
                    </span>
                    <span className="projekt-jahr">{projekt.jahr}</span>
                  </div>
                  <p className="projekt-beschreibung">{projekt.beschreibung}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="carousel-arrow carousel-arrow--right"
            onClick={() => scrollByDir("right")}
            aria-label="Weitere Projekte"
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

        <div className="projekte-dots" role="tablist" aria-label="Projekte">
          {PROJEKTE.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              className={`projekte-dot${activeIndex === i ? " active" : ""}`}
              onClick={() => scrollToIndex(i)}
              aria-label={`Projekt ${i + 1} anzeigen`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
