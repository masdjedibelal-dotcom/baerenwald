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

import {
  ProjektGalerie,
  type BaerenwaldProjekt,
} from "@/components/home/ProjektGalerie";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { SITE_CONFIG } from "@/lib/config";
import type { Situation as FunnelSituation } from "@/lib/funnel/types";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import {
  buildSearchUrl,
  getHeroSearchSuggestions,
  type HeroSearchSuggestion,
} from "@/lib/search";
const HOW_STEPS = [
  {
    emoji: "📞",
    title: "Du rufst einmal an.",
    desc: "Kein stundenlanges Erklären, kein Vergleichen von Angeboten. Du beschreibst was du dir vorstellst — wir machen daraus einen Plan.",
  },
  {
    emoji: "🛠️",
    title: "Wir übernehmen alles.",
    desc: "Maler, Elektriker, Fliesenleger — wir wissen wer wann kommen muss und in welcher Reihenfolge. Du bekommst Updates. Keine Überraschungen.",
  },
  {
    emoji: "✓",
    title: "Du nimmst ab.",
    desc: "Gemeinsame Abnahme, digitales Protokoll — und du weißt dass alles erledigt ist. So wie es sein sollte.",
  },
];

const EINSATZ_BLOCKS = [
  {
    titel: "Ein Ansprechpartner",
    text: "Nicht drei Nummern die du anrufst. Nicht du als Projektmanager zwischen den Gewerken. Einer der alles kennt — und alles koordiniert.",
    variant: "dark" as const,
  },
  {
    titel: "Preistransparenz",
    text: "Du siehst was dein Projekt kostet bevor du überhaupt anrufst. Nach dem Termin ein verbindlicher Festpreis. Kein Nachtrag ohne deine Zustimmung.",
    variant: "mist" as const,
  },
  {
    titel: "Immer auf dem Stand",
    text: "Statusupdates während des Projekts. Digitales Abnahmeprotokoll am Ende. Du weißt immer was läuft — ohne einmal nachfragen zu müssen.",
    variant: "soft" as const,
  },
];

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
      "Heizung im Januar ausgefallen — innerhalb von 24h war jemand da. Sehr zuverlässig und freundlich.",
  },
  {
    name: "Markus H.",
    rolle: "Pasing, München",
    initials: "MH",
    color: "gray" as const,
    quote:
      "Gartenpflege seit zwei Jahren. Kommt immer pünktlich, macht saubere Arbeit. Kann ich nur empfehlen.",
  },
];

const TESTIMONIAL_COLORS: Record<
  (typeof TESTIMONIALS)[number]["color"],
  { bg: string; color: string }
> = {
  amber: { bg: "#FAEEDA", color: "#854F0B" },
  gray: { bg: "#F1EFE8", color: "#444441" },
  green: { bg: "#EAF3DE", color: "#3B6D11" },
  teal: { bg: "#E1F5EE", color: "#0F6E56" },
  blue: { bg: "#E6F1FB", color: "#185FA5" },
};

const HERO_CHIPS: { label: string; situation: FunnelSituation }[] = [
  { label: "Zuhause erneuern", situation: "erneuern" },
  { label: "Reparatur / Defekt", situation: "kaputt" },
  { label: "Notfall — sofort", situation: "notfall" },
];

/** Echte Bärenwald-Referenzprojekte (Bildpfade Platzhalter bis finale Assets). */
const PROJEKTE: readonly BaerenwaldProjekt[] = [
  {
    id: 1,
    bild: "/images/projekt-heizung-notfall.jpg",
    bildAlt: "Heizungsanlage nach Notfalleinsatz in München",
    gewerk: "Notfalleinsatz",
    stadtteil: "München",
    jahr: "2024",
    tag: "notfall",
    problem: "Heizungsausfall im Winter — mehrere Wohnungen betroffen.",
    loesung:
      "Team kurzfristig organisiert, Fehler gefunden, Anlage wieder in Betrieb gebracht.",
    ergebnis: "Alle Wohnungen wieder warm — Problem vollständig gelöst.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #2E7D52)",
    placeholderEmoji: "⚡",
  },
  {
    id: 2,
    bild: "/images/projekt-burgermeister-abriss.jpg",
    bildAlt: "Abrissarbeiten Burgermeister Projekt München",
    gewerk: "Abriss & Entsorgung",
    stadtteil: "München",
    jahr: "2024",
    tag: "gewerbe",
    problem:
      "Kurzfristige Abrissarbeiten an Feiertagen — viele Firmen haben abgelehnt.",
    loesung:
      "Über unser Netzwerk kurzfristig Personal und Entsorgung organisiert.",
    ergebnis: "Projekt fristgerecht abgeschlossen.",
    placeholderGradient: "linear-gradient(135deg, #2D2520, #5C4033)",
    placeholderEmoji: "🔨",
  },
  {
    id: 3,
    bild: "/images/projekt-hausverwaltung.jpg",
    bildAlt:
      "Koordinierte Handwerksleistungen für Hausverwaltung München",
    gewerk: "Hausverwaltung",
    stadtteil: "München",
    jahr: "2024",
    tag: "verwaltung",
    problem: "Sanitär, Elektro, Wartung — viele einzelne Firmen, viel Chaos.",
    loesung:
      "Alle Gewerke über eine Struktur koordiniert — ein Ansprechpartner.",
    ergebnis: "Saubere Abläufe, weniger Stress für die Verwaltung.",
    placeholderGradient: "linear-gradient(135deg, #1A2D3D, #2E5C7D)",
    placeholderEmoji: "🏢",
  },
  {
    id: 4,
    bild: "/images/projekt-garten-privat.jpg",
    bildAlt: "Fertig gestaltete Außenanlage München",
    gewerk: "Gartengestaltung",
    stadtteil: "München",
    jahr: "2024",
    tag: "privat",
    problem: "Außenanlage komplett neu gestalten.",
    loesung: "Planung, Material und Umsetzung komplett koordiniert.",
    ergebnis: "Fertige Anlage aus einer Hand.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #4A7D2E)",
    placeholderEmoji: "🌿",
  },
];

function EinsatzIcon({ index }: { index: number }) {
  const cls = "vertrieb-ec-card-icon";
  const i = index % 3;
  if (i === 0) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tel = SITE_CONFIG.phone.replace(/\s/g, "");

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
    const el = document.querySelector(".how-timeline-block");
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("how-timeline-block--visible");
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
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
    router.push(
      `/rechner?leistung=${encodeURIComponent(s.slug)}&q=${encodeURIComponent(s.label)}`
    );
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
            src="/logo-white.png"
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
                <span className="hero-h1-line--1 au">Kein Vergleichsportal.</span>
                <span className="hero-h1-line--2 au d2">Ein Ansprechpartner.</span>
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
                      placeholder="Leistungsname exakt eingeben oder aus der Liste wählen …"
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
                    <button
                      type="submit"
                      className="hero-search-btn"
                      aria-label="Suchen"
                    >
                      <svg
                        className="hero-search-btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <circle cx="11" cy="11" r="7.5" />
                        <path d="m20 20-4.2-4.2" />
                      </svg>
                    </button>
                  </div>
                </div>
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
                          <span className="suggestion-emoji" aria-hidden>
                            {s.emoji}
                          </span>
                          <span className="suggestion-title">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </form>
              <div className="hero-chips fade-up d2">
                {HERO_CHIPS.map((c) => (
                  <Link
                    key={c.label}
                    className="hero-chip-link"
                    href={`/rechner?situation=${c.situation}`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hero-visual fade-up d2">
              <div className="hero-float-wrap">
                <div className="hero-floating-card hero-floating-card--top">
                  Meisterbetriebe München
                </div>
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
                <div className="hero-floating-card hero-floating-card--bottom">
                  Einer für alles
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-round" aria-hidden />
      </section>

      <section className="how-section" id="how">
        <div className="how-section-inner">
          <div className="how-tl-header fade-up">
            <h2 className="how-h2">So läuft es bei uns.</h2>
            <p className="how-tl-sub">
              Kein Abstimmen. Kein Nachfragen.
              <br />
              Kein Stress.
            </p>
          </div>
          <div className="how-timeline-block">
            <div className="how-timeline-wrap">
              <div className="how-timeline-line" aria-hidden>
                <div className="how-timeline-line-fill" />
              </div>
              <div className="how-timeline-steps">
                {HOW_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="how-tl-step"
                    style={{ ["--how-step-delay" as string]: `${0.08 + i * 0.12}s` }}
                  >
                    <div className="how-tl-step-marker">{step.emoji}</div>
                    <div className="how-tl-step-content">
                      <p className="how-tl-content-title">{step.title}</p>
                      <p className="how-tl-content-desc">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="how-tl-cta-wrap fade-up">
              <Link href="/rechner" className="how-tl-cta">
                Zum Preisrechner →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {leistungenSection}

      <section className="vertrieb-ec">
        <div className="vertrieb-ec-inner">
          <div className="vertrieb-ec-head fade-up">
            <h2 className="vertrieb-ec-h2">Warum Bärenwald?</h2>
            <p className="vertrieb-ec-sub">
              Wir glauben dass Handwerk
              <br />
              anders geht.
            </p>
          </div>
          <div className="vertrieb-ec-grid">
            {EINSATZ_BLOCKS.map((b, i) => (
              <div
                key={b.titel}
                className={`vertrieb-ec-card vertrieb-ec-card--${b.variant} fade-up d${i + 1}`}
              >
                <EinsatzIcon index={i} />
                <p className="vertrieb-ec-card-title">{b.titel}</p>
                <p className="vertrieb-ec-card-text">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <section className="testimonials-section">
        <div className="inner testimonials-band">
          <h2 className="checks-section-headline fade-up">Kundenstimmen</h2>
          <p className="checks-section-tagline fade-up d1" style={{ marginBottom: "32px" }}>
            Echte Rückmeldungen aus München und Umgebung.
          </p>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => {
              const col = TESTIMONIAL_COLORS[t.color];
              return (
                <div
                  key={t.initials}
                  className={`testimonial-card fade-up d${Math.min((i % 4) + 1, 4)}`}
                >
                  <div className="testimonial-stars" aria-hidden>
                    ★★★★★
                  </div>
                  <p className="testimonial-quote">{t.quote}</p>
                  <div className="testimonial-divider" />
                  <div className="testimonial-author">
                    <div
                      className="testimonial-avatar"
                      style={{ background: col.bg, color: col.color }}
                      aria-hidden
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="testimonial-name">{t.name}</p>
                      <p className="testimonial-rolle">{t.rolle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ProjektGalerie projekte={PROJEKTE} />

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
