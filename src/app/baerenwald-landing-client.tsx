"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { CTA } from "@/lib/cta-config";
import { SITE_CONFIG } from "@/lib/config";
import type { Situation as FunnelSituation } from "@/lib/funnel/types";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { LEISTUNGEN, leistungHref } from "@/lib/routes";
import { buildSearchUrl } from "@/lib/search";
const FACTS_CARDS = [
  {
    icon: "trend" as const,
    stat: "Ein Ansprechpartner",
    body: "Maler, Elektriker, Bodenleger — kein Abstimmen zwischen mehreren Betrieben.",
  },
  {
    icon: "clock" as const,
    stat: "Festpreisangebot",
    body: "Kein böses Erwachen — der Preis steht vor Auftragsbeginn fest.",
  },
  {
    icon: "target" as const,
    stat: "Meisterbetriebe",
    body: "Nur geprüfte Fachbetriebe aus München und Umgebung.",
  },
];

const HOW_STEPS = [
  {
    emoji: "🔍",
    title: "Was brauchst du?",
    desc: "Beschreib einfach dein Vorhaben — Bad renovieren, Heizung kaputt, Garten pflegen. In 2 Minuten siehst du einen realistischen Preisrahmen.",
  },
  {
    emoji: "📅",
    title: "Wir kommen vorbei",
    desc: "Kostenloser Vor-Ort-Termin. Wir schauen uns alles an und erstellen ein genaues Festpreisangebot. Kein Auftragszwang.",
  },
  {
    emoji: "✅",
    title: "Alles wird erledigt",
    desc: "Du lehnst dich zurück. Wir koordinieren alle Handwerker, Termine und Materialien. Eine Rechnung am Ende.",
  },
];

const EINSATZ_BLOCKS = [
  {
    titel: "Neue Anfragen generieren",
    text: "Der Preisrechner auf deiner Website holt Kunden genau dann ab wenn sie einen konkreten Bedarf haben.",
    variant: "dark" as const,
  },
  {
    titel: "Schnelle Orientierung",
    text: "Kunden sehen sofort was ihr Projekt kosten könnte — das spart beiden Seiten unnötige Gespräche.",
    variant: "mist" as const,
  },
  {
    titel: "Ein Termin reicht",
    text: "Kein Abstimmen mit drei Handwerkern. Ein Anruf, ein Termin, wir koordinieren den Rest.",
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
      "Ein Ansprechpartner für Maler und Elektro. Hat uns so viel Koordination erspart. Einfach angerufen und alles lief.",
  },
  {
    name: "Thomas R.",
    rolle: "Grünwald",
    initials: "TR",
    color: "amber" as const,
    quote:
      "Kostenlose Erstberatung, kein Druck. Das Angebot kam schnell und war klar. So wünscht man sich Handwerk.",
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

const BENEFITS_POINTS = [
  "Einmal anfragen — alles läuft",
  "Kostenloser Vor-Ort-Termin",
  "Festpreis vor Auftragsbeginn",
  "Meisterbetriebe aus München",
  "Ein Ansprechpartner für alle Gewerke",
  "Kein Auftragszwang",
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
  { label: "Renovieren", situation: "renovieren" },
  { label: "Sanieren", situation: "sanieren" },
  { label: "Notfall", situation: "notfall" },
  { label: "Garten & Haus", situation: "betreuung" },
];

const RENOVIERUNG = new Set([
  "malerarbeiten",
  "badezimmer-sanierung",
  "bodenbelag",
  "fenster-tueren",
  "trockenbau",
]);
const SANIERUNG = new Set(["heizung-sanitaer", "elektroarbeiten", "dacharbeiten"]);
const AUSSEN = new Set(["gartenpflege", "gartengestaltung", "winterdienst"]);

function leistungKategorie(slug: string): string {
  if (RENOVIERUNG.has(slug)) return "Renovierung";
  if (SANIERUNG.has(slug)) return "Sanierung";
  if (AUSSEN.has(slug)) return "Außen & Garten";
  return "Service";
}

function situationForSlug(slug: string): FunnelSituation {
  if (RENOVIERUNG.has(slug)) return "renovieren";
  if (SANIERUNG.has(slug)) return "sanieren";
  if (AUSSEN.has(slug)) return "betreuung";
  return "betreuung";
}

function FactsIcon({ type }: { type: "trend" | "clock" | "target" }) {
  const cls = "facts-card-icon-svg";
  if (type === "trend") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="m7 12 4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "clock") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function EinsatzIcon({ index }: { index: number }) {
  const cls = "vertrieb-ec-card-icon";
  if (index === 0) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (index === 1) {
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

export default function BaerenwaldLandingClient() {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

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

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(buildSearchUrl(searchQ));
  };

  return (
    <div className="baerenwald-landing">
      <header className="landing-nav">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden>
            🐻
          </span>
          <span>Bärenwald</span>
        </Link>
        <nav className="nav-links" aria-label="Hauptnavigation">
          <a href="#leistungen">Leistungen</a>
          <a href="#how">Wie es funktioniert</a>
          <a href="#faq">FAQ</a>
          <Link href="/kontakt">Kontakt</Link>
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
              <h1 className="hero-h1-split">
                <span className="hero-h1-line--1 au">Dein Projekt.</span>
                <span className="hero-h1-line--2 au d2">Wir kümmern uns.</span>
                <span className="hero-h1-line--3 au d3">Einfach.</span>
              </h1>
              <p className="hero-lead au d4">
                Beschreib was du brauchst — wir berechnen den Preisrahmen und
                koordinieren alle Handwerker.
              </p>
              <div className="hero-benefit-chips fade-up">
                <span className="hero-benefit-chip">
                  🏠 München &amp; Umgebung
                </span>
                <span className="hero-benefit-chip">⭐ Meisterbetriebe</span>
                <span className="hero-benefit-chip">✓ Kein Auftragszwang</span>
              </div>
              <form className="fade-up d1" onSubmit={onSearch}>
                <div className="hero-search-row">
                  <input
                    className="hero-search-input"
                    type="search"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value.slice(0, 80))}
                    placeholder="Was brauchst du? z.B. Bad, Heizung, Garten …"
                    aria-label="Suche"
                  />
                  <button type="submit" className="hero-search-btn">
                    Suchen
                  </button>
                </div>
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
              <div className="hero-btns fade-up d3">
                <Link href="/rechner" className="btn-hero-cta">
                  {CTA.hero}
                </Link>
              </div>
            </div>
            <div className="hero-visual fade-up d2">
              <div className="hero-float-wrap">
                <div className="hero-floating-card hero-floating-card--top">
                  Kostenlos &amp; unverbindlich
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
                  1 Ansprechpartner für alle Gewerke
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-round" aria-hidden />
      </section>

      <section className="facts-section section-soft-top">
        <div className="facts-inner">
          <h2 className="facts-h2 fade-up">Warum Bärenwald?</h2>
          <p className="facts-sub fade-up d1">Handwerk aus einer Hand — transparent und meisterlich.</p>
          <div className="facts-grid">
            {FACTS_CARDS.map((card, i) => (
              <div key={card.stat} className={`facts-card fade-up d${Math.min(i + 1, 4)}`}>
                <div className="facts-card-icon">
                  <FactsIcon type={card.icon} />
                </div>
                <p className="facts-card-stat">{card.stat}</p>
                <div className="facts-card-rule" />
                <p className="facts-card-body">{card.body}</p>
              </div>
            ))}
          </div>
          <p className="facts-note fade-up">Alle Koordination über Bärenwald — du sprichst nur mit uns.</p>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="how-section-inner">
          <div className="how-tl-header fade-up">
            <h2 className="how-h2">Wie es funktioniert</h2>
            <p className="how-tl-sub">Drei klare Schritte von der ersten Idee bis zur fertigen Leistung.</p>
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

      <section className="checks-section" id="leistungen">
        <div className="inner">
          <h2 className="checks-section-headline fade-up">Unsere Leistungen</h2>
          <div className="checks-section-taglines fade-up d1">
            <p className="checks-section-tagline">Von der Einzelreparatur bis zur Komplettsanierung.</p>
            <p className="checks-section-tagline">Details zur Leistung — oder direkt den Preisrahmen berechnen.</p>
          </div>
          <div className="ck-cards">
            {LEISTUNGEN.map((l, i) => (
              <article key={l.slug} className={`ck-card fade-up d${(i % 4) + 1}`}>
                <div className="ck-card-preview">
                  <span className="ck-card-icon-lg" aria-hidden>
                    {l.icon}
                  </span>
                </div>
                <div className="ck-card-right">
                  <div>
                    <p className="ck-card-cat">{leistungKategorie(l.slug)}</p>
                    <p className="ck-card-name">{l.label}</p>
                    <p className="ck-card-hook">{l.kurz}</p>
                    <p className="ck-card-erlebnis">{l.hint}</p>
                  </div>
                  <div className="ck-card-foot">
                    <div className="ck-card-btns">
                      <Link href={leistungHref(l.slug)} className="ck-demo">
                        Details →
                      </Link>
                      <Link
                        href={`/rechner?situation=${situationForSlug(l.slug)}`}
                        className="ck-buy"
                      >
                        Preisrahmen
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vertrieb-ec">
        <div className="vertrieb-ec-inner">
          <div className="vertrieb-ec-head fade-up">
            <h2 className="vertrieb-ec-h2">Dein Vorteil</h2>
            <p className="vertrieb-ec-sub">So arbeiten wir — damit du Zeit und Nerven sparst.</p>
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

      <section className="benefits-section">
          <div className="benefits-premium-shell fade-up">
          <div className="benefits-premium-card">
            <h2 className="benefits-premium-h2">Handwerk ohne Stress</h2>
            <div className="benefits-premium-sub">
              <p>Alles was du brauchst um dein Projekt stressfrei umzusetzen.</p>
            </div>
            <p className="benefits-premium-list-head">Das bekommst du</p>
            <ul className="benefits-premium-list">
              {BENEFITS_POINTS.map((pt, gi) => {
                const gid = `bw-check-grad-${gi}`;
                return (
                  <li key={pt} className="benefits-premium-row">
                    <span className="benefits-premium-row-text">{pt}</span>
                    <span className="benefits-premium-check" aria-hidden>
                      <svg className="benefits-premium-check-svg" viewBox="0 0 24 24" fill="none">
                        <defs>
                          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ddd6fe" />
                            <stop offset="50%" stopColor="#a7f3d0" />
                            <stop offset="100%" stopColor="#99f6e4" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke={`url(#${gid})`}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="benefits-premium-divider" />
            <p className="benefits-premium-bottom">Bärenwald Handwerksgruppe · München</p>
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="fade-up">
            <h2 className="how-h2">Häufige Fragen</h2>
            <p className="how-tl-sub" style={{ marginTop: "12px" }}>
              Nicht dabei? Ruf uns an — wir helfen persönlich weiter.
            </p>
            <a href={`tel:${tel}`} className="btn-cta" style={{ marginTop: "20px" }}>
              {SITE_CONFIG.phone}
            </a>
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
