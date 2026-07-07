import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { RATGEBER, ratgeberHref } from "@/lib/routes";

export const metadata = {
  title: "Ratgeber — Kosten & Ablauf | Bärenwald München",
  description:
    "Kosten, Ablauf und Tipps zu Renovierung, Bad, Boden, Heizung, Garten und mehr — speziell für München.",
};

export default function RatgeberIndexPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Brotkrumen">
              <Link href="/">Startseite</Link>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">Ratgeber</span>
            </nav>
            <div className="ratgeber-tag">Ratgeber & Kosten</div>
            <h1 className="page-hero-h1">
              Ratgeber für dein Projekt in München
            </h1>
            <p className="page-hero-sub">
              Planung, Budget und Ablauf — kompakt aufbereitet. Wähle ein
              Thema.
            </p>
          </div>
        </div>

        <section className="content-section content-section--white">
          <div className="content-section-inner fade-up d1">
            <h2 className="section-h2">Alle Themen</h2>
            <p className="section-sub">
              Von Malerarbeiten bis Winterdienst — mit typischen
              München-Preisen und Ablauf.
            </p>
            <div className="ratgeber-card-grid">
              {RATGEBER.map((r) => (
                <Link key={r.slug} href={ratgeberHref(r.slug)} className="ratgeber-card">
                  <span className="ratgeber-card-label">{r.label}</span>
                  <span className="ratgeber-card-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
