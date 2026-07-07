import Link from "next/link";

import { SemanticFaq } from "@/components/common/SemanticFaq";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { SITE_CONFIG } from "@/lib/config";
import { HANDWERKER_PREISE, HANDWERKER_RECHNER_SLUGS } from "@/lib/handwerker-config";
import type { HandwerkerContentItem } from "@/lib/handwerker-types";

function formatPreisDe(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Erster Satz → Subline, Rest → Fließtext */
export function splitHandwerkerIntro(intro: string): {
  subline: string;
  body: string;
} {
  const m = intro.match(/^([\s\S]+?[.!?])(?:\s+|$)([\s\S]*)/);
  if (m?.[1]) {
    return { subline: m[1].trim(), body: (m[2] ?? "").trim() };
  }
  return { subline: intro.trim(), body: "" };
}

export function HandwerkerSeoPage({ data }: { data: HandwerkerContentItem }) {
  const preis = HANDWERKER_PREISE[data.leistung];
  const rechnerSlug = HANDWERKER_RECHNER_SLUGS[data.leistung];
  if (!preis || !rechnerSlug) {
    throw new Error(
      `Handwerker SEO: fehlende Konfiguration für Leistung „${data.leistung}“`
    );
  }

  const rechnerHref = `/rechner?leistung=${encodeURIComponent(rechnerSlug)}`;
  const { subline, body } = splitHandwerkerIntro(data.intro);

  const faqItems = [
    { q: data.faqQuestion1, a: data.faqAnswer1 },
    { q: data.faqQuestion2, a: data.faqAnswer2 },
  ];

  return (
    <>
      <div id={`handwerker-${data.slug}`} className="baerenwald-landing">
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Brotkrumen">
              <Link href="/">Startseite</Link>
              <span className="breadcrumb-sep">›</span>
              <Link href="/#leistungen">Handwerker München</Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">{data.h1}</span>
            </nav>

            <div className="page-hero-tag">München &amp; Umgebung</div>

            <h1 className="page-hero-h1">{data.h1}</h1>
            <p className="page-hero-sub">{subline}</p>

            <div className="page-hero-btns">
              <Link href={rechnerHref} className="page-hero-btn-primary">
                Preisrahmen berechnen →
              </Link>
              <Link href={SITE_CONFIG.phoneHref} className="page-hero-btn-secondary">
                Direkt anrufen
              </Link>
            </div>

            <div className="page-hero-trust">
              <span>Meisterbetriebe München</span>
              <span>Anfahrt bei Auftrag</span>
              <span>Ein Ansprechpartner</span>
            </div>
          </div>
        </div>

        {body ? (
          <section className="article-section article-section--lg content-section content-section--white fade-up d1">
            <div className="article-section-inner">
              <div className="article-body">
                <p>{body}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section
          className={`article-section content-section content-section--${body ? "muted" : "white"} fade-up d2`}
        >
          <div className="article-section-inner">
            <h2 className="section-h2">{data.block1Title}</h2>
            <div className="article-body">
              <p>{data.block1Text}</p>
            </div>
          </div>
        </section>

        <div className="article-divider" aria-hidden />

        <section className="article-section content-section content-section--muted fade-up d3">
          <div className="article-section-inner">
            <span className="chapter-label">Preise München 2025</span>
            <h2 className="section-h2">Was kostet das?</h2>

            <div className="preis-inline">
              <span className="preis-inline-value">
                {formatPreisDe(preis.von)} – {formatPreisDe(preis.bis)} €
              </span>
              <span className="preis-inline-unit">{preis.einheit}</span>
            </div>

            <div className="hinweis">
              <p>
                Der endgültige Preis hängt vom Umfang ab — Festpreis nach
                Vor-Ort-Termin.
              </p>
            </div>

            <Link
              href={rechnerHref}
              className="page-hero-btn-primary"
              style={{ display: "inline-block", marginTop: "20px" }}
            >
              Preis für mein Projekt berechnen →
            </Link>
          </div>
        </section>

        <div className="article-divider" aria-hidden />

        <section className="article-section content-section content-section--white fade-up d4">
          <div className="article-section-inner">
            <h2 className="section-h2">{data.block2Title}</h2>
            <div className="article-body">
              <p>{data.block2Text}</p>
            </div>
          </div>
        </section>

        <div className="article-divider" aria-hidden />

        <section className="article-section content-section content-section--muted fade-up d1">
          <div className="article-section-inner">
            <span className="chapter-label">Vorteile</span>
            <h2 className="section-h2">Warum Bärenwald</h2>
            <ul className="handwerker-warum-list">
              <li>
                <span aria-hidden>✓ </span>Ein Ansprechpartner
              </li>
              <li>
                <span aria-hidden>✓ </span>Meisterbetriebe
              </li>
              <li>
                <span aria-hidden>📐 </span>Transparente Preise
              </li>
              <li>
                <span aria-hidden>💶 </span>Festpreis nach Termin
              </li>
            </ul>
          </div>
        </section>

        <div className="article-divider" aria-hidden />

        <section className="article-section content-section content-section--white fade-up d2">
          <div className="article-section-inner">
            <span className="chapter-label">Häufige Fragen</span>
            <h2 className="section-h2" style={{ marginBottom: "28px" }}>
              Was Kunden uns fragen
            </h2>
            <div className="article-faq">
              <SemanticFaq items={faqItems} />
            </div>
          </div>
        </section>

        <div className="final-cta-section">
          <div className="final-cta-bg">BW</div>
          <div className="final-cta-inner">
            <h2 className="final-cta-h2">Bereit für dein Projekt?</h2>
            <p className="final-cta-sub">{data.ctaText}</p>
            <div className="final-cta-btns">
              <Link href={rechnerHref} className="final-cta-btn-primary">
                Jetzt loslegen →
              </Link>
              <Link href={SITE_CONFIG.phoneHref} className="final-cta-btn-ghost">
                Direkt anrufen
              </Link>
            </div>
            <p className="final-cta-trust">
              Unverbindlich · Festpreisangebot · Meisterbetriebe München
            </p>
          </div>
        </div>
      </div>
      <WhatsAppFloat />
    </>
  );
}
