"use client";
import { PALETTE } from "@/lib/tokens/palette";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SiteIcon } from "@/components/ui/SiteIcon";

import { BaerenwaldVisionInner } from "@/components/home/BaerenwaldVisionInner";
import {
  HowTimelineMotion,
} from "@/components/home/HowTimelineMotion";
import {
  ProjektGalerie,
  type BaerenwaldProjekt,
} from "@/components/home/ProjektGalerie";
import {
  TestimonialsMarquee,
  type MarqueeTestimonial,
} from "@/components/home/TestimonialsMarquee";
import { SectionDivider } from "@/components/landing/SectionDividers";
import { VermittlungSection } from "@/components/home/VermittlungSection";
import { WarumBaerenwaldScrollSection } from "@/components/landing/WarumBaerenwaldScrollSection";
import { CTAButton } from "@/components/ui/CTAButton";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { WaveUnderline } from "@/components/ui/WaveUnderline";
import { SITE_CONFIG } from "@/lib/config";
import { CTA } from "@/lib/cta-config";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { capturePostHogEvent } from "@/lib/consent/posthog-client";
import { ANFRAGE_HREF, RECHNER_HREF } from "@/lib/rechner-links";

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
] satisfies readonly MarqueeTestimonial[];

/** Echte Bärenwald-Referenzprojekte (Bildpfade Platzhalter bis finale Assets). */
const PROJEKTE: readonly BaerenwaldProjekt[] = [
  {
    id: 8,
    bild: "/images/projekt-badsanierung-ramersdorf-perlach.png",
    bilder: [
      "/images/projekt-badsanierung-ramersdorf-perlach.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-2.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-3.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-4.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-5.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-6.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-7.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-8.png",
    ],
    bildAlt:
      "Komplette Badsanierung Ramersdorf-Perlach: Entkernung, Elektro-Unterverteilung, Feuchtraum, Fliesen, Geberit-Unterputz, Dusche und fertiges modernes Bad mit LED-Spots",
    gewerk: "Komplette Badsanierung in München Ramersdorf-Perlach",
    stadtteil: "Privat",
    jahr: "2026",
    tag: "privat",
    problem:
      "Die Umsetzung erfolgte durch eigene Teams sowie koordinierte Meisterbetriebe aus den Bereichen Sanitär, Heizung, Elektro, Trockenbau und Fliesenbau.\n\nDurch die enge Zusammenarbeit mit erfahrenen Partner-Meisterbetrieben konnte das Projekt fachgerecht, termingerecht und nach aktuellem technischen Standard umgesetzt werden.",
    loesung:
      "Leistungsumfang:\n\n• Komplette Entkernung und Rückbau\n• Neuinstallation Sanitär- und Abwasserleitungen\n• Elektro-Neuinstallation inklusive Unterverteilung\n• LED-Beleuchtung und Deckenspots\n• Geberit-Unterputzsysteme\n• Feuchtraum-Trockenbau und Abdichtung\n• Estrich- und Fliesenarbeiten\n• Montage von Dusche, WC, Waschtisch und Badmöbeln\n• Installation elektrischer Fußbodenheizung\n• Endmontage, Funktionsprüfung und Übergabe",
    ergebnis:
      "Alle Arbeiten wurden professionell koordiniert und durch eigene Fachkräfte sowie Partner-Meisterbetriebe umgesetzt. Das Ergebnis ist ein modernes, hochwertiges Badezimmer mit aktueller Sanitär- und Elektrotechnik.",
    placeholderGradient: `linear-gradient(135deg, ${PALETTE.h1a2d36}, ${PALETTE.h2d5a6e})`,
    placeholderEmoji: "🛁",
  },
  {
    id: 2,
    bild: "/images/projekt-abriss-notdienst-2024.png",
    bilder: [
      "/images/projekt-abriss-notdienst-2024.png",
      "/images/projekt-abriss-notdienst-2024-2.png",
      "/images/projekt-abriss-notdienst-2024-3.png",
      "/images/projekt-abriss-notdienst-2024-4.png",
      "/images/projekt-abriss-notdienst-2024-5.png",
    ],
    bildAlt:
      "Gewerbeumbau in München: Abriss und Rohbau mit freigelegten Installationen, Baustellenkoordination und Elektriker am Verteiler",
    gewerk: "Abriss & Gewerbeumbau",
    stadtteil: "München",
    jahr: "2024",
    tag: "gewerbe",
    problem:
      "Kurz vor Weihnachten stand ein laufender Gewerbeumbau still: keine verfügbaren Fachbetriebe, blockierte Entsorgungs- und Containerlogistik sowie ausstehende Straßengenehmigungen. Der komplette Zeitplan war gefährdet und Folgegewerke konnten nicht starten.",
    loesung:
      "• Sofortiger Notdiensteinsatz und Übernahme der kompletten Baustellenkoordination\n• Aktivierung unseres Partnernetzwerks für kurzfristige Unterstützung\n• Organisation und Durchführung der Abbrucharbeiten\n• Koordination von Entsorgung, Containerlogistik und Baustellenabläufen\n• Sicherstellung der Stromversorgung für Abbruch und Baustellenbetrieb durch unseren Elektropartner-Meisterbetrieb\n• Laufende Abstimmung mit allen beteiligten Gewerken vor Ort",
    ergebnis:
      "Der komplette Abriss konnte trotz kritischer Ausgangslage fristgerecht umgesetzt werden. Entsorgung und Logistik wurden auch während des Engpasses organisiert, sodass die nachfolgenden Gewerke ohne Verzögerung weiterarbeiten konnten.\n\nUmsetzung durch eigene Teams und spezialisierte Meister- und Partnerbetriebe.",
    placeholderGradient: `linear-gradient(135deg, ${PALETTE.h2d2520}, ${PALETTE.h5c4033})`,
    placeholderEmoji: "🔨",
  },
  {
    id: 4,
    bild: "/images/projekt-dachterrasse-naturstein-2024.png",
    bilder: [
      "/images/projekt-dachterrasse-naturstein-2024.png",
      "/images/projekt-dachterrasse-naturstein-2024-2.png",
      "/images/projekt-dachterrasse-naturstein-2024-3.png",
      "/images/projekt-dachterrasse-naturstein-2024-4.png",
      "/images/projekt-dachterrasse-naturstein-2024-5.png",
      "/images/projekt-dachterrasse-naturstein-2024-6.png",
    ],
    bildAlt:
      "Dachterrasse München: fertig verlegter Naturstein, Spezialaufbau, Estrichpumpe und Schlauchführung bis in den 5. Stock, Montage und Statikerabstimmung",
    gewerk: "Dachterrasse / Sonderlösung Naturstein",
    stadtteil: "München",
    jahr: "2024",
    tag: "privat",
    problem:
      "Natursteinmaterial im Wert von ca. 25.000 € war bereits gekauft, die ursprünglich geplante Standardverlegung auf Dachterrasse und Stellplatz jedoch technisch und wirtschaftlich nicht umsetzbar. Zusätzlich handelte es sich um einen sehr schweren und empfindlichen Naturstein, der aufgrund seiner Bruchanfälligkeit nur mit einer speziellen Verlegetechnik verarbeitet werden konnte.",
    loesung:
      "• Technische Analyse der gesamten Dachterrassenkonstruktion inklusive Abstimmung zum zulässigen Aufbaugewicht\n• Entwicklung einer Sonderlösung gemeinsam mit einem spezialisierten Estrich- und Natursteinbetrieb\n• Organisation der Materialförderung per Estrichpumpe bis in den 5. Stock\n• Herstellung eines tragfähigen Spezialaufbaus unter Berücksichtigung der statischen Anforderungen\n• Verarbeitung des Natursteins mit aufwendiger Haftbrücken-Technik: gewaschener Sand wurde in die Haftbrücke eingearbeitet und zusätzlich beidseitig verarbeitet, um Stabilität und dauerhafte Verbindung sicherzustellen\n• Laufende Abstimmung anhand des Statikerberichts zur sicheren Lastverteilung auf der Dachterrasse\n• Koordination aller beteiligten Gewerke bis zur finalen Fertigstellung",
    ergebnis:
      "Der komplette Naturstein konnte trotz der schwierigen Rahmenbedingungen vollständig verbaut werden — ohne Materialverlust und ohne massive Zusatzkosten. Die technisch anspruchsvolle Dachterrasse wurde statisch sicher umgesetzt und erfolgreich abgeschlossen. Die finale Ausführung und Übergabe erfolgte auf sehr hohem Niveau im Bereich Garten- und Landschaftsbau.",
    placeholderGradient: `linear-gradient(135deg, var(--fl-accent-dark), ${PALETTE.h4a7d2e})`,
    placeholderEmoji: "🌿",
  },
  {
    id: 5,
    bild: "/images/projekt-terrasse-steg-bogenhausen.png",
    bilder: [
      "/images/projekt-terrasse-steg-bogenhausen.png",
      "/images/projekt-terrasse-steg-bogenhausen-2.png",
      "/images/projekt-terrasse-steg-bogenhausen-3.png",
      "/images/projekt-terrasse-steg-bogenhausen-4.png",
    ],
    bildAlt:
      "Terrassen- und Steganlage Bogenhausen: Holzoberflächen mit biologischem Osmoholz-Öl behandelt, abgestimmt auf Naturpool und Gartenlandschaft",
    gewerk: "Terrassen- und Steganlage in München Bogenhausen",
    stadtteil: "Privat",
    jahr: "2026",
    tag: "privat",
    problem:
      "Die hochwertigen Holzflächen der bestehenden Terrassen- und Steganlage sollten dauerhaft geschützt und optisch aufgewertet werden. Gewünscht war eine natürliche und nachhaltige Oberflächenbehandlung ohne chemische Beschichtungen, passend zur hochwertigen Garten- und Naturpoolanlage.",
    loesung:
      "• Vorbereitung und Kontrolle der Holzoberflächen\n• Fachgerechte Reinigung der Terrassen- und Stegbereiche\n• Natürliche Behandlung mit biologischem Osmoholz-Öl\n• Gleichmäßige und sorgfältige Einarbeitung des Öls\n• Schutz und Pflege der Holzoberflächen für langfristige Werterhaltung\n• Abstimmung auf die bestehende Garten- und Poollandschaft",
    ergebnis:
      "Die Behandlung wurde vollständig durch das eigene Team von Bärenwald Garten- und Landschaftsbau ausgeführt. Durch die natürliche Ölbehandlung konnten die Holzoberflächen nachhaltig geschützt, optisch aufgewertet und optimal auf die Anforderungen im Außenbereich abgestimmt werden. Das Ergebnis fügt sich harmonisch in die hochwertige Garten- und Naturpoollandschaft ein und unterstützt den langfristigen Werterhalt der Anlage.\n\n✓ Ausgeführt durch eigenes Gewerk – Bärenwald Garten- und Landschaftsbau 🌿",
    placeholderGradient: `linear-gradient(135deg, ${PALETTE.h1b2e1f}, ${PALETTE.h3d6b45})`,
    placeholderEmoji: "🪵",
  },
];

export default function BaerenwaldLandingClient({
  leistungenSection,
}: {
  leistungenSection?: ReactNode;
}) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

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

    root.querySelectorAll(".hero-copy .fade-up").forEach((el) => {
      el.classList.add("visible");
    });

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
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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
          <a href="#kontakt">Kontakt</a>
          <Link href="/portal/login">Kundenportal</Link>
          <Link href="/partner/login">Handwerkerportal</Link>
        </nav>
        <Link
          href={ANFRAGE_HREF}
          className="nav-cta"
          onClick={() =>
            capturePostHogEvent("cta_anfrage_clicked", { location: "nav" })
          }
        >
          {CTA.nav}
        </Link>
        <button
          type="button"
          className="landing-nav-mobile-toggle"
          onClick={() => setMobileOpen(true)}
          aria-label="Menü öffnen"
        >
          <SiteIcon n="menu" ctx="default" size={22} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="site-mobile-menu" role="dialog" aria-modal="true">
          <div className="site-mobile-menu-head">
            <Link href="/" className="logo" onClick={closeMobile}>
              <Image
                src="/logo-mark-green.png"
                alt="Bärenwald München"
                width={36}
                height={36}
                className="logo-img"
              />
              <span>Bärenwald</span>
            </Link>
            <button
              type="button"
              className="site-mobile-close"
              onClick={closeMobile}
              aria-label="Menü schließen"
            >
              <SiteIcon n="x" ctx="default" size={18} aria-hidden />
            </button>
          </div>
          <nav className="site-mobile-links" aria-label="Hauptnavigation">
            <a href="#how" onClick={closeMobile}>
              Wie es funktioniert
            </a>
            <a href="#leistungen" onClick={closeMobile}>
              Leistungen
            </a>
            <a href="#faq" onClick={closeMobile}>
              FAQ
            </a>
            <a href="#kontakt" onClick={closeMobile}>
              Kontakt
            </a>
            <Link href="/ratgeber" onClick={closeMobile}>
              Ratgeber
            </Link>
            <Link href="/portal/login" onClick={closeMobile}>
              Kundenportal
            </Link>
            <Link href="/partner/login" onClick={closeMobile}>
              Handwerkerportal
            </Link>
          </nav>
          <Link
            href={ANFRAGE_HREF}
            className="site-mobile-cta"
            onClick={() => {
              closeMobile();
              capturePostHogEvent("cta_anfrage_clicked", {
                location: "nav_mobile",
              });
            }}
          >
            {CTA.nav} →
          </Link>
        </div>
      ) : null}

      <section className="hero-shell">
        <div className="hero-bg" aria-hidden>
          <div className="hero-bg-blob hero-bg-blob-1" />
          <div className="hero-bg-blob hero-bg-blob-2" />
          <div className="hero-bg-grid" />
          <div className="hero-bg-glow" />
        </div>
        <div className="hero-section">
          <div className="hero">
            <div className="hero-copy">
              <p className="hero-eyebrow">Generalunternehmer &amp; Handwerksbetrieb</p>
              <h1 className="hero-h1-split">
                <span className="hero-h1-line--1 au">
                  Ihr Bauvorhaben.
                </span>
                <WaveUnderline
                  className="hero-h1-line--2 hero-h1-wave au d2"
                  tone="on-light"
                >
                  <em>Unsere Umsetzung.</em>
                </WaveUnderline>
              </h1>
              <p className="hero-lead au d4">
                Wir bauen um, sanieren und gestalten neu: mit eigenen
                Handwerkern, Elektrotechnik unter Meisterleitung und rund 70
                Partnerbetrieben. Für Privatkunden, Hausverwaltungen,
                Unternehmen und Investoren in München.
              </p>
              <div className="hero-actions-row au d5" style={{ marginTop: 28 }}>
                <div className="hero-cta-paar">
                  <CTAButton
                    bare
                    tone="hero"
                    href={ANFRAGE_HREF}
                    label={CTA.anfrage}
                    onClick={() =>
                      capturePostHogEvent("cta_anfrage_clicked", {
                        location: "hero",
                      })
                    }
                  />
                  <CTAButton
                    bare
                    tone="hero-secondary"
                    href={RECHNER_HREF}
                    label={CTA.hero}
                    onClick={() =>
                      capturePostHogEvent("cta_rechner_clicked", {
                        location: "hero",
                      })
                    }
                  />
                </div>
                <p
                  className="hero-actions-sub"
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "var(--fl-muted)",
                  }}
                >
                  {CTA.heroSub}
                </p>
              </div>
            </div>

            <div className="hero-visual fade-up d2">
              <div className="hero-float-wrap">
                <div className="hero-phones-clip">
                  <Image
                    src="/images/hero-handwerk-muenchen.png"
                    alt="Handwerker-Team bei der Koordination einer Renovierung in München"
                    fill
                    className="hero-phones-img"
                    sizes="(min-width: 1025px) 320px, 0px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-round" aria-hidden />
      </section>

      <SectionDivider variant="baum" from="var(--fl-bg)" to="var(--fl-accent)" />

      <HowTimelineMotion />

      {leistungenSection}

      <SectionDivider variant="hugel" from="var(--fl-bg)" to="var(--fl-accent-dark)" />

      <WarumBaerenwaldScrollSection />

      <section
        className="vision-section fade-up"
        aria-labelledby="vision-heading"
      >
        <div className="vision-section-inner">
          <BaerenwaldVisionInner />
        </div>
      </section>

      <SectionDivider variant="welle" from="var(--fl-bg)" to="var(--fl-bg)" />

      <section className="testimonials-section">
        <div className="inner testimonials-band">
          <h2 className="checks-section-headline fade-up">Kundenstimmen</h2>
          <p
            className="checks-section-tagline fade-up d1"
            style={{ marginBottom: 32 }}
          >
            Echte Rückmeldungen aus München und Umgebung.
          </p>
          <TestimonialsMarquee testimonials={TESTIMONIALS} />
        </div>
      </section>

      <SectionDivider variant="welle" from="var(--fl-bg)" to="var(--fl-bg)" />

      <ProjektGalerie projekte={PROJEKTE} />

      <SectionDivider variant="baum" from="var(--fl-bg)" to="var(--fl-accent)" />

      <section
        className="final-cta-section landing-final-cta"
        aria-labelledby="landing-final-cta-h2"
      >
        <div className="final-cta-inner">
          <h2 id="landing-final-cta-h2" className="final-cta-h2">
            Lernen wir Ihr Vorhaben kennen.
          </h2>
          <p className="final-cta-sub">
            Ein einzelnes Gewerk oder ein umfassendes Projekt: Beschreiben Sie
            uns, was Sie planen. Gemeinsam klären wir die nächsten Schritte.
          </p>
          <div className="final-cta-actions">
            <CTAButton
              bare
              tone="final"
              href={ANFRAGE_HREF}
              label={CTA.final}
              className="btn-main"
              onClick={() =>
                capturePostHogEvent("cta_anfrage_clicked", {
                  location: "final_cta",
                })
              }
            />
            <CTAButton
              bare
              tone="final-ghost"
              href={SITE_CONFIG.phoneHref}
              label={`${SITE_CONFIG.phone} anrufen`}
              onClick={() =>
                capturePostHogEvent("cta_phone_clicked", { location: "final_cta" })
              }
            />
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="fade-up">
            <h2 className="how-h2">Häufige Fragen</h2>
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
          <div className="fade-up d3 faq-inner-follow-up">
            <p className="how-tl-sub" style={{ marginTop: 20 }}>
              <a href="/ratgeber/generalunternehmer-vs-einzelhandwerker-muenchen">
                Generalunternehmer vs. Einzelhandwerker — Ratgeber lesen →
              </a>
            </p>
            <p className="how-tl-sub" style={{ marginTop: 28 }}>
              Nicht dabei? Rufen Sie uns an — wir helfen persönlich weiter.
            </p>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <a
                href={SITE_CONFIG.phoneHref}
                className="btn-cta"
                onClick={() =>
                  capturePostHogEvent("cta_phone_clicked", { location: "faq" })
                }
              >
                {SITE_CONFIG.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider variant="welle" from="var(--fl-bg)" to="var(--fl-panel)" />

      <VermittlungSection />

      <MarketingFooter />
    </div>
  );
}
