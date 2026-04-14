import Link from "next/link";

import { SemanticFaq } from "@/components/common/SemanticFaq";
import { SITE_CONFIG } from "@/lib/config";
import { CTA } from "@/lib/cta-config";
import type { LeistungsData } from "@/lib/leistungen/types";
import { ratgeberHref } from "@/lib/routes";

export type { LeistungsData } from "@/lib/leistungen/types";

function formatPreisDe(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none">
      <path
        d="M16.667 5L7.5 14.167 3.333 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const telHref = `tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`;

export interface LeistungsPageProps {
  slug: string;
  data: LeistungsData;
}

export function LeistungsPage({ slug, data }: LeistungsPageProps) {
  const rechnerHref = `/rechner?situation=${encodeURIComponent(data.rechnerSituation)}`;

  return (
    <div id={`leistung-${slug}`} className="baerenwald-landing">
      <div className="page-hero">
        <div className="page-hero-inner">
          <nav className="breadcrumb" aria-label="Brotkrumen">
            <Link href="/">Startseite</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/#leistungen">Leistungen</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{data.label}</span>
          </nav>
          <div className="page-hero-tag">Leistungen in München</div>
          <h1 className="page-hero-h1">{data.headline}</h1>
          <p className="page-hero-sub">{data.subline}</p>
          <div className="page-hero-btns">
            <Link href={rechnerHref} className="page-hero-btn-primary">
              Was kostet das bei mir?
            </Link>
            <Link href={telHref} className="page-hero-btn-secondary">
              Direkt anrufen
            </Link>
          </div>
          <div className="page-hero-trust">
            <span>✓ Kostenlos & unverbindlich</span>
            <span>✓ Meisterbetriebe</span>
            <span>✓ München & Umgebung</span>
          </div>
        </div>
      </div>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d1">
          <div className="content-two-col">
            <div>
              <h2 className="section-h2">Was wir für dich tun</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>
                {data.beschreibung}
              </p>
            </div>
            <div>
              <p className="section-eyebrow section-eyebrow--muted">
                Das übernehmen wir
              </p>
              <ul className="check-list">
                {data.wasWirMachen.map((line) => (
                  <li key={line}>
                    <span className="check-list-icon">
                      <CheckIcon />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d2">
          <div className="section-eyebrow">Preise München 2024/25</div>
          <h2 className="section-h2">Was kostet das?</h2>
          <p className="section-sub">
            Richtwerte für München — der genaue Preis folgt nach dem
            kostenlosen Vor-Ort-Termin.
          </p>
          <div className="preis-box">
            <div className="preis-box-head">Richtwert München 2024/25</div>
            <div className="preis-box-body">
              <div className="preis-rows">
                <div className="preis-row">
                  <span className="preis-row-label">Preis von</span>
                  <div className="preis-range" style={{ marginBottom: 0 }}>
                    <span className="preis-range-value">
                      {formatPreisDe(data.preisVon)} €
                    </span>
                    <span className="preis-range-unit">{data.preisEinheit}</span>
                  </div>
                </div>
                <div className="preis-row">
                  <span className="preis-row-label">Preis bis</span>
                  <div className="preis-range" style={{ marginBottom: 0 }}>
                    <span className="preis-range-value">
                      {formatPreisDe(data.preisBis)} €
                    </span>
                    <span className="preis-range-unit">{data.preisEinheit}</span>
                  </div>
                </div>
              </div>
              <div className="preis-hint">{data.preisHinweis}</div>
            </div>
            <div className="preis-foot">
              Kostenloser Vor-Ort-Termin für genaues Angebot
            </div>
          </div>
          <Link
            href={rechnerHref}
            className="page-hero-btn-primary"
            style={{ marginTop: "16px", display: "inline-block" }}
          >
            {CTA.section} →
          </Link>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d3">
          <h2 className="section-h2">Warum Bärenwald für {data.label}</h2>
          <p className="section-sub">
            Kurz gesagt: ein Ansprechpartner, klare Preise, saubere Arbeit.
          </p>
          <div className="vorteile-grid">
            {data.vorteile.map((v) => (
              <div key={v.text}>
                <div className="vorteil-card-icon" aria-hidden>
                  {v.icon}
                </div>
                <p className="vorteil-card-text">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d4">
          <div className="koordination-box">
            <div>
              <h2 className="section-h2" style={{ marginBottom: "8px" }}>
                Noch nicht sicher?
              </h2>
              <p className="koordination-box-text">
                In unserem Ratgeber erklären wir alles, was du vor der
                Beauftragung wissen solltest — Kosten, Ablauf, Zeitaufwand und
                mehr.
              </p>
            </div>
            <Link
              href={ratgeberHref(data.ratgeberSlug)}
              className="koordination-box-link"
            >
              {data.ratgeberLabel} →
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner">
          <div
            className="faq-inner fade-up d1"
            style={{ gridTemplateColumns: "1fr 2fr" }}
          >
            <div>
              <h2 className="section-h2">Häufige Fragen</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>
                Zu {data.label} in München
              </p>
            </div>
            <SemanticFaq items={data.faq} />
          </div>
        </div>
      </section>

      <div className="final-cta-section">
        <div className="final-cta-bg">BW</div>
        <div className="final-cta-inner">
          <h2 className="final-cta-h2">Bereit für dein Projekt?</h2>
          <p className="final-cta-sub">
            Kostenloser Vor-Ort-Termin — kein Auftragszwang.
          </p>
          <div className="final-cta-btns">
            <Link href={rechnerHref} className="final-cta-btn-primary">
              Jetzt loslegen →
            </Link>
            <Link href={telHref} className="final-cta-btn-ghost">
              Direkt anrufen
            </Link>
          </div>
          <p className="final-cta-trust">
            Kostenlos · Unverbindlich · Festpreis
          </p>
        </div>
      </div>
    </div>
  );
}
