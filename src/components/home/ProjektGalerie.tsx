"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { cn } from "@/lib/utils";

export type BaerenwaldProjektTag =
  | "notfall"
  | "gewerbe"
  | "verwaltung"
  | "privat";

export type BaerenwaldProjekt = {
  id: number;
  bild: string;
  bildAlt: string;
  gewerk: string;
  stadtteil: string;
  jahr: string;
  tag: BaerenwaldProjektTag;
  problem: string;
  loesung: string;
  ergebnis: string;
  /** Gradient unter dem Bild bis echte Assets da sind */
  placeholderGradient: string;
  placeholderEmoji: string;
};

const PROJEKT_TAG_LABEL: Record<BaerenwaldProjektTag, string> = {
  notfall: "Notfall",
  gewerbe: "Gewerbe",
  verwaltung: "Verwaltung",
  privat: "Privat",
};

const SCROLL_STEP = 376;

function ProjektBild({
  bild,
  bildAlt,
  placeholderGradient,
  placeholderEmoji,
}: Pick<
  BaerenwaldProjekt,
  | "bild"
  | "bildAlt"
  | "placeholderGradient"
  | "placeholderEmoji"
>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showPlaceholder = !loaded || failed;

  return (
    <div
      className="projekt-bild-wrap"
      style={{ background: placeholderGradient }}
    >
      <div
        className={cn(
          "projekt-bild-placeholder-layer",
          !showPlaceholder && "projekt-bild-placeholder-layer--hidden"
        )}
        aria-hidden
      >
        <span className="projekt-placeholder-emoji projekt-placeholder-emoji--card">
          {placeholderEmoji}
        </span>
      </div>
      {!failed ? (
        <Image
          src={bild}
          alt={bildAlt}
          fill
          className={cn("projekt-bild", loaded && "projekt-bild--loaded")}
          sizes="(max-width: 680px) 85vw, 380px"
          onLoadingComplete={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
      ) : null}
      {loaded && !failed ? (
        <div className="projekt-bild-gradient" aria-hidden />
      ) : null}
    </div>
  );
}

export function ProjektGalerie({
  projekte,
}: {
  projekte: readonly BaerenwaldProjekt[];
}) {
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
  }, [updateActiveFromScroll, projekte.length]);

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
            Von Notfalleinsätzen bis zur kompletten Außenanlage — koordiniert,
            pünktlich, sauber abgeschlossen.
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
            {projekte.map((projekt, i) => (
              <div
                key={projekt.id}
                className="projekt-card fade-up"
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                <ProjektBild
                  bild={projekt.bild}
                  bildAlt={projekt.bildAlt}
                  placeholderGradient={projekt.placeholderGradient}
                  placeholderEmoji={projekt.placeholderEmoji}
                />
                <div className="projekt-info">
                  <div className="projekt-meta projekt-meta--tags">
                    <span
                      className={cn(
                        "projekt-tag",
                        `projekt-tag--${projekt.tag}`
                      )}
                    >
                      {PROJEKT_TAG_LABEL[projekt.tag]}
                    </span>
                  </div>
                  <div className="projekt-meta projekt-meta--detail">
                    <span className="projekt-gewerk-name">{projekt.gewerk}</span>
                    <span className="projekt-meta-dot" aria-hidden>
                      ·
                    </span>
                    <span className="projekt-stadtteil">{projekt.stadtteil}</span>
                    <span className="projekt-meta-dot" aria-hidden>
                      ·
                    </span>
                    <span className="projekt-jahr">{projekt.jahr}</span>
                  </div>

                  <div className="projekt-ple">
                    <div className="projekt-ple-row">
                      <span className="projekt-ple-icon" aria-hidden>
                        ⚡
                      </span>
                      <p className="projekt-ple-text">{projekt.problem}</p>
                    </div>
                    <div className="projekt-ple-row">
                      <span className="projekt-ple-icon" aria-hidden>
                        🔧
                      </span>
                      <p className="projekt-ple-text">{projekt.loesung}</p>
                    </div>
                    <div className="projekt-ple-row projekt-ple-row--ergebnis">
                      <span className="projekt-ple-icon" aria-hidden>
                        ✓
                      </span>
                      <p className="projekt-ple-text">{projekt.ergebnis}</p>
                    </div>
                  </div>
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
          {projekte.map((_, i) => (
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
