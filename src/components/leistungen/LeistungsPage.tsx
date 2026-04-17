import Link from "next/link";

import { SemanticFaq } from "@/components/common/SemanticFaq";
import { SITE_CONFIG } from "@/lib/config";
import type { LeistungsData } from "@/lib/leistungen/types";
import { ratgeberHref } from "@/lib/routes";

export type { LeistungsData } from "@/lib/leistungen/types";

function formatPreisDe(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function vorteilParts(text: string): { title: string; desc: string } {
  const i = text.indexOf("—");
  if (i === -1) return { title: text.trim(), desc: "" };
  return {
    title: text.slice(0, i).trim(),
    desc: text.slice(i + 1).trim(),
  };
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

          <div className="page-hero-tag">München &amp; Umgebung</div>

          <h1 className="page-hero-h1">{data.headline}</h1>
          <p className="page-hero-sub">{data.subline}</p>

          <div className="page-hero-btns">
            <Link href={rechnerHref} className="page-hero-btn-primary">
              Preisrahmen berechnen →
            </Link>
            <Link href={telHref} className="page-hero-btn-secondary">
              Direkt anrufen
            </Link>
          </div>

          <div className="page-hero-trust">
            <span>Meisterbetriebe München</span>
            <span>Anfahrt wird bei Auftrag angerechnet</span>
            <span>Festpreisangebot</span>
          </div>
        </div>
      </div>

      <section
        className="article-section article-section--lg content-section content-section--white fade-up d1"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Was wir für dich tun</span>

          <div className="article-body">
            <p>{data.beschreibung}</p>
          </div>

          <ol className="simple-list">
            {data.wasWirMachen.map((item, i) => (
              <li key={item}>
                <span className="simple-list-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--muted fade-up d2"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Preise München 2024/25</span>
          <h2 className="section-h2">Was kostet das?</h2>

          <div className="preis-inline">
            <span className="preis-inline-value">
              {formatPreisDe(data.preisVon)} – {formatPreisDe(data.preisBis)} €
            </span>
            <span className="preis-inline-unit">{data.preisEinheit}</span>
          </div>

          <div className="hinweis">
            <p>{data.preisHinweis}</p>
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

      <section
        className="article-section content-section content-section--white fade-up d3"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Warum Bärenwald</span>

          <div className="vorteile-inline">
            {data.vorteile.map((v) => {
              const { title, desc } = vorteilParts(v.text);
              return (
                <div key={v.text} className="vorteil-item">
                  <span className="vorteil-item-emoji" aria-hidden>
                    {v.icon}
                  </span>
                  <div className="vorteil-item-title">{title}</div>
                  {desc ? <div className="vorteil-item-text">{desc}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--muted fade-up d4"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Häufige Fragen</span>
          <h2 className="section-h2" style={{ marginBottom: "28px" }}>
            Was Kunden uns fragen
          </h2>

          <div className="article-faq">
            <SemanticFaq items={data.faq} />
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section--sm content-section content-section--white fade-up d1"
        style={{ padding: "36px 2rem" }}
      >
        <div className="article-section-inner">
          <div className="koordination-box">
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--fl-accent-dark)",
                  marginBottom: "4px",
                }}
              >
                Noch nicht sicher?
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--fl-text-2)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                In unserem Ratgeber erklären wir alles was du vorher wissen
                solltest — Kosten, Ablauf und Zeitaufwand.
              </p>
            </div>
            <Link href={ratgeberHref(data.ratgeberSlug)} className="koordination-box-link">
              {data.ratgeberLabel} →
            </Link>
          </div>
        </div>
      </section>

      <div className="final-cta-section">
        <div className="final-cta-bg">BW</div>
        <div className="final-cta-inner">
          <h2 className="final-cta-h2">Bereit für dein Projekt?</h2>
          <p className="final-cta-sub">
            Preisrahmen berechnen — Anfahrt wird bei Beauftragung angerechnet.
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
            Unverbindlich · Festpreisangebot · Meisterbetriebe München
          </p>
        </div>
      </div>
    </div>
  );
}
