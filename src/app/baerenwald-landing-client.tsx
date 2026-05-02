"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { HowTimelineMotion } from "@/components/home/HowTimelineMotion";
import {
  ProjektGalerie,
  type BaerenwaldProjekt,
} from "@/components/home/ProjektGalerie";
import {
  TestimonialsMarquee,
  type MarqueeTestimonial,
} from "@/components/home/TestimonialsMarquee";
import { SectionDivider } from "@/components/landing/SectionDividers";
import { WarumBaerenwaldScrollSection } from "@/components/landing/WarumBaerenwaldScrollSection";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { WaveUnderline } from "@/components/ui/WaveUnderline";
import { SITE_CONFIG } from "@/lib/config";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import {
  buildHeroRechnerLandingUrl,
  buildSearchUrl,
  getHeroSearchSuggestions,
  heroKategorieLabel,
  type HeroSearchSuggestion,
} from "@/lib/search";

const TESTIMONIALS = [
  {
    name: "Familie K.",
    rolle: "Schwabing, München",
    initials: "FK",
    color: "green" as const,
    quote:
      "Transparente Preisspanne, pünktlicher Handwerker — genau das was wir gesucht haben. Kein Stress mit verschiedenen Betrieben.",
  },
  {
    name: "Lena M.",
    rolle: "Maxvorstadt, München",
    initials: "LM",
    color: "teal" as const,
    quote:
      "Ich hätte nie gedacht dass Bad-Renovierung so reibungslos läuft. Fliesen, Sanitär, Elektro — ich hatte einen Ansprechpartner für alles. Kein einziger Anruf den ich selbst koordinieren musste.",
  },
  {
    name: "Thomas R.",
    rolle: "Grünwald",
    initials: "TR",
    color: "amber" as const,
    quote:
      "Unverbindliche Beratung, kein Druck. Das Angebot kam schnell und war klar. So wünscht man sich Handwerk.",
  },
  {
    name: "Sandra B.",
    rolle: "Bogenhausen, München",
    initials: "SB",
    color: "blue" as const,
    quote:
      "Heizung im Januar ausgefallen — innerhalb von 48h war jemand da. Sehr zuverlässig und freundlich.",
  },
  {
    name: "Markus H.",
    rolle: "Pasing, München",
    initials: "MH",
    color: "gray" as const,
    quote:
      "Gartenpflege seit zwei Jahren. Kommt immer pünktlich, macht saubere Arbeit. Kann ich nur empfehlen.",
  },
] satisfies readonly MarqueeTestimonial[];

const HERO_LEISTUNG_CHIPS = [
  { label: "🚿 Bad", leistung: "badezimmer-sanierung", situation: "erneuern" },
  { label: "🪵 Boden", leistung: "bodenbelag", situation: "erneuern" },
  { label: "🖌️ Streichen", leistung: "malerarbeiten", situation: "erneuern" },
  { label: "🔥 Heizung", leistung: "heizung-sanitaer", situation: "erneuern" },
  { label: "⚡ Strom", leistung: "elektroarbeiten", situation: "erneuern" },
  { label: "🌿 Garten", leistung: "gartenpflege", situation: "betreuung" },
  { label: "🪟 Fenster", leistung: "fenster-tueren", situation: "erneuern" },
  { label: "🚨 Notfall", leistung: "dacharbeiten", situation: "notfall" },
] as const;

/** Echte Bärenwald-Referenzprojekte (Bildpfade Platzhalter bis finale Assets). */
const PROJEKTE: readonly BaerenwaldProjekt[] = [
  {
    id: 1,
    bild: "/images/projekt-notdienst-kein-warmwasser.jpg",
    bilder: [
      "/images/projekt-notdienst-kein-warmwasser.jpg",
      "/images/projekt-notdienst-kein-warmwasser-2.jpg",
    ],
    bildAlt:
      "Detailaufnahme einer Heizungsanlage beim Notdienst-Einsatz wegen Warmwasserausfall",
    gewerk: "Notdienst / Kein Warmwasser",
    stadtteil: "München",
    jahr: "2026",
    tag: "notfall",
    problem:
      "Kein Warmwasser im ganzen Haus: komplette Versorgung ausgefallen, hoher Zeitdruck und sofortige Reaktion erforderlich.",
    loesung:
      "Vor-Ort-Analyse sofort gestartet, Problem dokumentiert, Partnerbetrieb Mauro Heizung & Sanitär vorbereitet und Umsetzung koordiniert: Pumpe/Steuerung erneuert, System entlüftet und neu eingestellt.",
    ergebnis:
      "Warmwasserversorgung vollständig wiederhergestellt — Umsetzung in 2 Tagen mit minimaler Ausfallzeit und einem zentralen Ansprechpartner.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #2E7D52)",
    placeholderEmoji: "⚡",
  },
  {
    id: 2,
    bild: "/images/projekt-burgermeister-abriss.jpg",
    bilder: ["/images/projekt-burgermeister-abriss.jpg"],
    bildAlt:
      "Baustellenfoto vom Gewerbe-Projekt (Ladenabriss) in München während Abriss und Rückbau",
    gewerk: "Abriss & Notdienst",
    stadtteil: "München",
    jahr: "2024",
    tag: "gewerbe",
    problem:
      "Kurz vor Weihnachten: keine Verfügbarkeit bei Betrieben, Entsorgung und Containerlogistik blockiert, Straßengenehmigung erst nach Neujahr.",
    loesung:
      "Notdiensteinsatz sofort gestartet, Partnernetzwerk aktiviert und Abriss, Entsorgung sowie Koordination komplett übernommen.",
    ergebnis:
      "Abriss vollständig umgesetzt, Entsorgung trotz Engpass organisiert und Folgegewerke konnten direkt ohne Verzögerung starten.",
    placeholderGradient: "linear-gradient(135deg, #2D2520, #5C4033)",
    placeholderEmoji: "🔨",
  },
  {
    id: 3,
    bild: "/images/projekt-gefahrenabwehr-baum-notfall.jpg",
    bilder: [
      "/images/projekt-gefahrenabwehr-baum-notfall.jpg",
      "/images/projekt-gefahrenabwehr-baum-notfall-2.jpg",
    ],
    bildAlt:
      "Gebrochener Baumast im Innenhof einer Wohnanlage als akutes Sicherheitsrisiko",
    gewerk: "Gefahrenabwehr Baum / Notfall",
    stadtteil: "Hausverwaltung · München",
    jahr: "2026",
    tag: "notfall",
    problem:
      "Großer Ast gebrochen, akute Gefahr für Bewohner und Passanten im Innenhof — sofortiger Handlungsbedarf.",
    loesung:
      "Eigene GaLaBau-Mannschaft in unter 2 Stunden disponiert, Vor-Ort-Gefährdungsanalyse durchgeführt und beschädigten Ast fachgerecht mit Sicherungstechnik zurückgeschnitten.",
    ergebnis:
      "Gefahrenquelle am selben Tag beseitigt, Sicherheit sofort wiederhergestellt und Schnittgut vollständig entsorgt inkl. Einsatzdokumentation und Rechnung am Einsatztag.",
    placeholderGradient: "linear-gradient(135deg, #1A2D3D, #2E5C7D)",
    placeholderEmoji: "🌳",
  },
  {
    id: 4,
    bild: "/images/projekt-dachterrasse-sonderloesung.jpg",
    bilder: [
      "/images/projekt-dachterrasse-sonderloesung.jpg",
      "/images/projekt-dachterrasse-sonderloesung-2.jpg",
    ],
    bildAlt:
      "Baustelle Dachterrasse in München mit Sonderlösung für Naturstein im 5. Stock",
    gewerk: "Dachterrasse Sonderlösung",
    stadtteil: "München",
    jahr: "2024",
    tag: "privat",
    problem:
      "Naturstein bereits gekauft (ca. 25.000 €), aber Standardverlegung auf Terrasse/Stellplatz technisch und wirtschaftlich nicht umsetzbar.",
    loesung:
      "Mit Partner Chiemsee Estrich Sonderlösung umgesetzt: Material per Estrichpumpe in den 5. Stock, tragfähigen Unterbau hergestellt und Naturstein direkt verlegt.",
    ergebnis:
      "Naturstein vollständig genutzt, massive Zusatzkosten vermieden und Projekt in enger Innenstadtlage technisch sicher abgeschlossen.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #4A7D2E)",
    placeholderEmoji: "🌿",
  },
  {
    id: 5,
    bild: "/images/projekt-schwimmbad-feuchtigkeit-villa.jpg",
    bilder: ["/images/projekt-schwimmbad-feuchtigkeit-villa.jpg"],
    bildAlt:
      "Technikbereich einer Schwimmbadanlage in einer Villa in Grünwald während Feuchtigkeitsanalyse",
    gewerk: "Schwimmbad / Feuchtigkeitsanalyse",
    stadtteil: "Privatvilla, Grünwald",
    jahr: "2026",
    tag: "privat",
    problem:
      "Hallenbad seit Jahren mit hoher Feuchtigkeit, mehrere Fachfirmen ohne nachhaltige Lösung — Problem bestand über 4 Jahre.",
    loesung:
      "Vor-Ort-Analyse von Lüftung und Luftströmen inkl. Fotodokumentation, wöchentlicher Auswertung und strukturierter Übergabe an spezialisierten Fachbetrieb mit zentraler Koordination.",
    ergebnis:
      "Ursache klar identifiziert, Lüftung technisch angepasst und feinjustiert — Feuchtigkeitsentwicklung gestoppt und Anlage wieder stabil in Betrieb.",
    placeholderGradient: "linear-gradient(135deg, #1A2D3D, #2E5C7D)",
    placeholderEmoji: "💧",
  },
  {
    id: 6,
    bild: "/images/projekt-gruenwald-schaedlingsbefall-premium.jpg",
    bilder: [
      "/images/projekt-gruenwald-schaedlingsbefall-premium.jpg",
      "/images/projekt-gruenwald-schaedlingsbefall-premium-2.jpg",
    ],
    bildAlt:
      "Beschädigte Außenanlage in Grünwald vor Neupflanzung nach Schädlingsbefall",
    gewerk: "Schädlingsbefall & Premium-Lösung",
    stadtteil: "Villa, Grünwald",
    jahr: "2026",
    tag: "privat",
    problem:
      "Buchshecke massiv durch Schädlinge beschädigt, keine funktionierende Bewässerung und akuter Handlungsbedarf in hochwertiger Außenanlage.",
    loesung:
      "Kompletter Neuaufbau statt Reparatur: Partner Blumenhof Ensinger für Pflanzen/Fachberatung eingebunden, Bärenwald-Team übernahm Rückbau, Bodenvorbereitung, Neupflanzung und Erstpflege.",
    ergebnis:
      "Außenanlage hochwertig und nachhaltig wiederhergestellt — pflegeleichte Lösung mit sauberer Linienführung, umgesetzt aus einer Hand.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #4A7D2E)",
    placeholderEmoji: "🌱",
  },
];

export default function BaerenwaldLandingClient({
  leistungenSection,
}: {
  leistungenSection?: ReactNode;
}) {
  const router = useRouter();
  const searchComboRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestActive, setSuggestActive] = useState(-1);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const searchSuggestions = useMemo(
    () => getHeroSearchSuggestions(searchQ, 5),
    [searchQ]
  );
  const showSearchSuggestions =
    searchFocused && searchSuggestions.length > 0;

  useEffect(() => {
    const root = document.querySelector(".baerenwald-landing");
    if (!root) return;
    const els = root.querySelectorAll(".fade-up");

    const markIfInView = (el: Element) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      if (r.top < vh && r.bottom > 0) {
        el.classList.add("visible");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );

    els.forEach((el) => {
      markIfInView(el);
      io.observe(el);
    });

    const onResize = () => {
      els.forEach((el) => markIfInView(el));
    };
    window.addEventListener("resize", onResize, { passive: true });

    requestAnimationFrame(() => {
      els.forEach((el) => markIfInView(el));
    });

    return () => {
      window.removeEventListener("resize", onResize);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const nav = document.querySelector(".landing-nav");
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 20) nav.classList.add("landing-nav--scrolled");
      else nav.classList.remove("landing-nav--scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!searchFocused) return;
    const onDocDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (searchComboRef.current?.contains(t)) return;
      if (portalDropdownRef.current?.contains(t)) return;
      setSearchFocused(false);
      setSuggestActive(-1);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [searchFocused]);

  useEffect(() => {
    setSuggestActive(-1);
  }, [searchQ]);

  const goToSuggestion = (s: HeroSearchSuggestion) => {
    router.push(buildHeroRechnerLandingUrl(s.slug, s.label));
    setSearchFocused(false);
    setSuggestActive(-1);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (
      showSearchSuggestions &&
      suggestActive >= 0 &&
      suggestActive < searchSuggestions.length
    ) {
      goToSuggestion(searchSuggestions[suggestActive]!);
      return;
    }
    router.push(buildSearchUrl(searchQ));
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestActive((i) =>
        i < searchSuggestions.length - 1 ? i + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestActive((i) =>
        i <= 0 ? searchSuggestions.length - 1 : i - 1
      );
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchFocused(false);
      setSuggestActive(-1);
    }
  };

  return (
    <div className="baerenwald-landing">
      <header className="landing-nav">
        <Link href="/" className="logo">
          <Image
            src="/logo-mark-green.png"
            alt="Bärenwald München Logo"
            width={36}
            height={36}
            className="logo-img"
          />
          <span>Bärenwald</span>
        </Link>
        <nav className="nav-links" aria-label="Hauptnavigation">
          <a href="#how">Wie es funktioniert</a>
          <a href="#leistungen">Leistungen</a>
          <a href="#faq">FAQ</a>
          <a href="#faq">Kontakt</a>
        </nav>
        <Link href="/rechner" className="nav-cta">
          Angebot anfordern
        </Link>
      </header>

      <section className="hero-shell">
        <div className="hero-bg" aria-hidden>
          <div className="hero-bg-blob hero-bg-blob-1" />
          <div className="hero-bg-blob hero-bg-blob-2" />
          <div className="hero-bg-grid" />
          <div className="hero-bg-glow" />
        </div>

        <div className="hero-section">
          <div className="hero">
            <div>
              <p className="hero-eyebrow">Handwerker München</p>
              <h1 className="hero-h1-split">
                <span className="hero-h1-line--1 au">
                  Kein Vergleichsportal.
                </span>
                <WaveUnderline
                  className="hero-h1-line--2 hero-h1-wave au d2"
                  tone="on-light"
                >
                  <em>Ein Ansprechpartner.</em>
                </WaveUnderline>
                <span className="hero-h1-line--3 au d3">Für alles.</span>
              </h1>
              <p className="hero-lead au d4">
                Du willst renovieren — aber nicht drei Handwerker koordinieren,
                auf Rückrufe warten und am Ende selbst nachfragen ob alles
                stimmt. Bärenwald übernimmt das.
              </p>
              <form className="fade-up d1 hero-search-form" onSubmit={onSearch}>
                <div ref={searchComboRef} className="hero-search-combo">
                  <div className="hero-search-row">
                    <input
                      className="hero-search-input"
                      type="search"
                      value={searchQ}
                      onChange={(e) =>
                        setSearchQ(e.target.value.slice(0, 80))
                      }
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => {
                        requestAnimationFrame(() => {
                          const root = searchComboRef.current;
                          const portal = portalDropdownRef.current;
                          const ae = document.activeElement;
                          if (portal && ae && portal.contains(ae)) return;
                          if (!root || !ae || !root.contains(ae)) {
                            setSearchFocused(false);
                            setSuggestActive(-1);
                          }
                        });
                      }}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Preis berechnen – z. B. Bad, Boden, Heizung"
                      aria-label="Was suchst du?"
                      aria-autocomplete="list"
                      aria-controls="hero-search-listbox"
                      aria-expanded={showSearchSuggestions}
                      aria-activedescendant={
                        showSearchSuggestions && suggestActive >= 0
                          ? `hero-search-opt-${suggestActive}`
                          : undefined
                      }
                      autoComplete="off"
                    />
                    <button type="submit" className="hero-search-btn">
                      Preis ermitteln
                    </button>
                  </div>
                  <p className="hero-disclaimer">
                    Unverbindliche Schätzung — kein Kostenvoranschlag
                  </p>
                  {showSearchSuggestions ? (
                    <div
                      ref={portalDropdownRef}
                      className="search-dropdown-portal"
                    >
                      <ul
                        id="hero-search-listbox"
                        className="search-dropdown-portal-list"
                        role="listbox"
                        aria-label="Vorschläge"
                      >
                        {searchSuggestions.map((s, idx) => (
                          <li
                            key={s.slug}
                            id={`hero-search-opt-${idx}`}
                            role="option"
                            aria-selected={idx === suggestActive}
                            className={
                              idx === suggestActive
                                ? "search-suggestion search-suggestion--active"
                                : "search-suggestion"
                            }
                            onMouseDown={(e) => {
                              e.preventDefault();
                              goToSuggestion(s);
                            }}
                            onMouseEnter={() => setSuggestActive(idx)}
                          >
                            <span className="suggestion-title">{s.label}</span>
                            <span className="suggestion-kategorie-badge">
                              {heroKategorieLabel(s.category)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </form>
              {!showSearchSuggestions ? (
                <div className="hero-chips fade-up d2">
                  {HERO_LEISTUNG_CHIPS.map((c) => (
                    <Link
                      key={c.leistung}
                      className="hero-chip-link"
                      href={`/rechner?leistung=${c.leistung}&situation=${c.situation}&nf=1`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="hero-visual fade-up d2">
              <div className="hero-float-wrap">
                <div className="hero-phones-clip">
                  <Image
                    src="/images/hero-handwerk-muenchen.png"
                    alt="Handwerker-Team bei der Koordination einer Renovierung in München — Bärenwald"
                    fill
                    className="hero-phones-img"
                    sizes="(max-width: 768px) min(92vw, 380px) 380px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-round" aria-hidden />
      </section>

      <SectionDivider variant="baum" from="#f7f6f3" to="#2E7D52" />

      <HowTimelineMotion />

      <SectionDivider variant="baum" from="#2E7D52" to="#f7f6f3" flip />

      {leistungenSection}

      <SectionDivider variant="hugel" from="#f7f6f3" to="#1A3D2B" />

      <WarumBaerenwaldScrollSection />

      <SectionDivider variant="hugel" from="#1A3D2B" to="#f7f6f3" flip />

      <section
        className="vision-section fade-up"
        aria-labelledby="vision-heading"
      >
        <div className="vision-section-inner">
          <p className="vision-eyebrow">Wer hinter Bärenwald steht</p>
          <h2 id="vision-heading" className="vision-headline">
            Gegründet weil Handwerk
            <br />
            besser geht.
          </h2>
          <p className="vision-text">
            Wir haben Bärenwald 2020 gegründet weil wir selbst erlebt haben wie
            frustrierend eine Renovierung sein kann. Drei verschiedene
            Handwerker, drei verschiedene Meinungen — und niemand der das
            Gesamtbild sieht.
          </p>
          <div className="vision-divider" aria-hidden />
          <p className="vision-text">
            Unsere Vision ist ein Handwerk das koordiniert, kommuniziert und
            dokumentiert. Transparent von Anfang an — mit einem festen Preis,
            einem festen Ansprechpartner und einem digitalen Protokoll am Ende.
            So wie es sein sollte.
          </p>
        </div>
      </section>

      <SectionDivider variant="welle" from="#f7f6f3" to="#f7f6f3" />

      <section className="testimonials-section">
        <div className="inner testimonials-band">
          <h2 className="checks-section-headline fade-up">Kundenstimmen</h2>
          <p
            className="checks-section-tagline fade-up d1"
            style={{ marginBottom: "32px" }}
          >
            Echte Rückmeldungen aus München und Umgebung.
          </p>
          <TestimonialsMarquee testimonials={TESTIMONIALS} />
        </div>
      </section>

      <SectionDivider variant="welle" from="#f7f6f3" to="#f7f6f3" />

      <ProjektGalerie projekte={PROJEKTE} />

      <SectionDivider variant="baum" from="#f7f6f3" to="#2E7D52" />

      <section
        className="final-cta-section landing-final-cta"
        aria-labelledby="landing-final-cta-h2"
      >
        <div className="final-cta-inner">
          <h2 id="landing-final-cta-h2" className="final-cta-h2">
            Bereit für dein Projekt?
          </h2>
          <p className="final-cta-sub">
            Preisrahmen in wenigen Minuten — ein Ansprechpartner für die
            Umsetzung.
          </p>
          <div className="final-cta-btns">
            <Link
              href="/rechner"
              className="final-cta-btn-primary btn-primary"
            >
              Zum Preisrechner
            </Link>
            <a href={SITE_CONFIG.phoneHref} className="final-cta-btn-ghost">
              {SITE_CONFIG.phone} anrufen
            </a>
          </div>
        </div>
      </section>

      <SectionDivider variant="baum" from="#2E7D52" to="#f7f6f3" flip />

      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="fade-up">
            <h2 className="how-h2">Häufige Fragen</h2>
            <p className="how-tl-sub" style={{ marginTop: "12px" }}>
              Nicht dabei? Ruf uns an — wir helfen persönlich weiter.
            </p>
            <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              <a href={SITE_CONFIG.phoneHref} className="btn-cta">
                {SITE_CONFIG.phone}
              </a>
            </div>
          </div>
          <div className="faq fade-up d2">
            {HOME_FAQ_ITEMS.map((item, i) => {
              const open = faqOpen === i;
              return (
                <div key={item.q} className={`faq-row${open ? " open" : ""}`}>
                  <button type="button" className="faq-q" onClick={() => setFaqOpen(open ? null : i)}>
                    <span>{item.q}</span>
                    <span className="faq-ico">+</span>
                  </button>
                  <div className="faq-a">{item.a}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
