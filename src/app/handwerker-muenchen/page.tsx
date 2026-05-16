import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import handwerkerContent from "@/data/handwerker-content.json";
import { SITE_CONFIG } from "@/lib/config";
import type { HandwerkerContentItem } from "@/lib/handwerker-types";

const content = handwerkerContent as HandwerkerContentItem[];

const LEISTUNGEN = [
  "maler",
  "elektriker",
  "sanitaer",
  "bodenleger",
  "fliesenleger",
  "heizung",
  "dachdecker",
  "badsanierung",
] as const;

const LEISTUNG_LABELS: Record<(typeof LEISTUNGEN)[number], string> = {
  maler: "Malerarbeiten",
  elektriker: "Elektriker",
  sanitaer: "Sanitär",
  bodenleger: "Bodenleger",
  fliesenleger: "Fliesenleger",
  heizung: "Heizung",
  dachdecker: "Dachdecker",
  badsanierung: "Badsanierung",
};

const title =
  "Handwerker München — alle Stadtteile & Leistungen | Bärenwald";

const description =
  "Handwerker in München und Umgebung — Malerarbeiten, Badsanierung, Elektriker, Heizung und mehr. Alle Stadtteile auf einen Blick.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: `${SITE_CONFIG.url}/handwerker-muenchen`,
  },
  openGraph: {
    title,
    description,
    url: `${SITE_CONFIG.url}/handwerker-muenchen`,
    images: [{ url: "/og-image.png" }],
  },
};

export default function HandwerkerMuenchenPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing handwerker-hub">
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Brotkrumen">
              <Link href="/">Startseite</Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">Handwerker München</span>
            </nav>

            <h1 className="page-hero-h1">
              Handwerker München —
              <br />
              alle Stadtteile
            </h1>
            <p className="page-hero-sub">
              Bärenwald koordiniert Handwerksleistungen in ganz München und
              Umgebung. Ein Ansprechpartner für alle Gewerke.
            </p>

            <div className="page-hero-btns">
              <Link href="/rechner" className="page-hero-btn-primary">
                Preisrahmen berechnen →
              </Link>
            </div>
          </div>
        </div>

        <div className="handwerker-hub-body article-section-inner">
          {LEISTUNGEN.map((leistung) => {
            const items = content
              .filter((c) => c.leistung === leistung)
              .sort((a, b) => a.h1.localeCompare(b.h1, "de"));

            if (items.length === 0) return null;

            return (
              <section key={leistung} className="handwerker-hub-section">
                <h2 className="handwerker-hub-section-title">
                  {LEISTUNG_LABELS[leistung]} in München
                </h2>
                <div className="handwerker-hub-grid">
                  {items.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/${c.slug}`}
                      className="stadtteil-links-item"
                    >
                      {c.h1}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="final-cta-section">
          <div className="final-cta-bg">BW</div>
          <div className="final-cta-inner">
            <h2 className="final-cta-h2">Nicht das Richtige dabei?</h2>
            <div className="final-cta-btns">
              <Link href="/rechner" className="final-cta-btn-primary">
                Preisrahmen berechnen →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
