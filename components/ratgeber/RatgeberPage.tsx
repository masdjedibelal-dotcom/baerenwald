import Link from "next/link";

import { SemanticFaq } from "@/components/common/SemanticFaq";
import { SITE_CONFIG } from "@/lib/config";
import type { RatgeberData } from "@/lib/ratgeber/types";
import { ratgeberReadingMinutes } from "@/lib/ratgeber/reading-time";
import { leistungHref } from "@/lib/routes";

export type { RatgeberData } from "@/lib/ratgeber/types";

function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

const telHref = `tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`;

function splitIconText(line: string): { icon: string; text: string } {
  const sp = line.indexOf(" ");
  if (sp > 0) {
    return { icon: line.slice(0, sp), text: line.slice(sp + 1).trim() };
  }
  return { icon: "", text: line };
}

export interface RatgeberPageProps {
  data: RatgeberData;
}

export function RatgeberPage({ data }: RatgeberPageProps) {
  const lesezeit = ratgeberReadingMinutes(data);
  const updated = new Date(data.dateModified).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const rechnerHref = `/rechner?leistung=${encodeURIComponent(data.leistungsSlug)}`;
  const leistungUrl = leistungHref(data.leistungsSlug);

  const wbPunkte = data.wannBrauche.punkte;
  const introLead =
    wbPunkte.length > 0 ? wbPunkte[0]! : data.wannBrauche.title;
  const introRest = wbPunkte.length > 1 ? wbPunkte.slice(1) : [];

  const faktorenText =
    data.kosten.faktoren.length > 0
      ? data.kosten.faktoren.join(", ")
      : "Umfang, Material und Zustand vor Ort";

  const zeitFaktorenText =
    data.zeitaufwand.faktoren.length > 0
      ? data.zeitaufwand.faktoren.join(", ")
      : "Koordination und Umfang";

  return (
    <div className="baerenwald-landing">
      <div className="page-hero">
        <div className="page-hero-inner">
          <nav className="breadcrumb" aria-label="Brotkrumen">
            <Link href="/">Startseite</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/ratgeber">Ratgeber</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{data.titel}</span>
          </nav>

          <div className="ratgeber-tag">Ratgeber &amp; Kosten</div>

          <h1 className="page-hero-h1">{data.hero.headline}</h1>
          <p className="page-hero-sub">{data.hero.subline}</p>

          <div className="ratgeber-meta">
            <span>München 2024/25</span>
            <span>Lesezeit: ca. {lesezeit} Min.</span>
            <span>Update: {updated}</span>
          </div>
        </div>
      </div>

      <div className="ratgeber-intro content-section content-section--white fade-up d1">
        <p className="ratgeber-intro-lead">{introLead}</p>
        {introRest.length > 0 ? (
          <ol className="simple-list">
            {introRest.map((p) => (
              <li key={p}>
                <span className="simple-list-num">—</span>
                {p}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--muted fade-up d2"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Schritt für Schritt</span>
          <h2 className="section-h2">So läuft das ab</h2>

          <div className="ablauf-timeline">
            <div className="ablauf-timeline-line" aria-hidden />
            {data.ablauf.map((s, i) => (
              <div
                key={s.schritt}
                className="ablauf-step fade-up"
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                <div className="ablauf-step-num">{i + 1}</div>
                <h3 className="ablauf-step-title">{s.schritt}</h3>
                <p className="ablauf-step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--white fade-up d3"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Was du vorher wissen solltest</span>
          <div className="article-body">
            {data.voraussetzungen.map((v) => (
              <p key={v}>{v}</p>
            ))}
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--muted fade-up d4"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Materialien &amp; Varianten</span>
          <h2 className="section-h2">Welche Optionen gibt es?</h2>

          <table className="preis-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Preis</th>
                <th>Geeignet für</th>
              </tr>
            </thead>
            <tbody>
              {data.materialien.map((m) => (
                <tr key={m.name}>
                  <td>
                    <div>{m.name}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "var(--fl-text-3)",
                        marginTop: "2px",
                      }}
                    >
                      {m.beschreibung}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{m.vonBis}</td>
                  <td>{m.fuer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--white fade-up d1"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Preise München 2024/25</span>
          <h2 className="section-h2">Was kostet das wirklich?</h2>

          <div className="preis-inline">
            <span className="preis-inline-value">
              {formatEuro(data.kosten.von)} – {formatEuro(data.kosten.bis)} €
            </span>
            <span className="preis-inline-unit">{data.kosten.einheit}</span>
          </div>

          <div className="article-body">
            <p>
              <strong>Was den Preis beeinflusst:</strong> {faktorenText}.
            </p>
            <p>{data.kosten.beispiel}</p>
          </div>

          <div className="hinweis">
            <p>
              Alle Preise sind Richtwerte für München 2024/25. Der genaue Preis
              hängt von Zustand, Zugänglichkeit und Materialwahl ab — beim
              Vor-Ort-Termin nennen wir einen festen Preis.
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

      <section
        className="article-section--sm content-section content-section--muted fade-up d2"
        style={{ padding: "48px 2rem" }}
      >
        <div className="article-section-inner">
          <span className="chapter-label">Zeitaufwand</span>
          <h2 className="section-h2">Wie lange dauert das?</h2>

          <div className="zeit-inline">
            <div className="zeit-inline-item">
              <div className="zeit-inline-label">Klein</div>
              <div className="zeit-inline-value">{data.zeitaufwand.klein}</div>
            </div>
            <div className="zeit-inline-item">
              <div className="zeit-inline-label">Mittel</div>
              <div className="zeit-inline-value">{data.zeitaufwand.mittel}</div>
            </div>
            <div className="zeit-inline-item">
              <div className="zeit-inline-label">Groß</div>
              <div className="zeit-inline-value">{data.zeitaufwand.gross}</div>
            </div>
          </div>

          <div className="article-body">
            <p>
              <strong>Was die Dauer beeinflusst:</strong> {zeitFaktorenText}.
            </p>
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--white fade-up d3"
      >
        <div className="article-section-inner">
          <div className="koordination-box">
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--fl-accent-dark)",
                  marginBottom: "6px",
                }}
              >
                Was wir koordinieren
              </div>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--fl-text-2)",
                  margin: "0 0 12px",
                  lineHeight: 1.65,
                }}
              >
                {data.koordination}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {data.koordinationUsps.map((u) => (
                  <span
                    key={u}
                    style={{
                      fontSize: "13px",
                      color: "var(--fl-accent)",
                      fontWeight: 600,
                    }}
                  >
                    → {u}
                  </span>
                ))}
              </div>
            </div>
            <Link href={leistungUrl} className="koordination-box-link">
              Zur Leistungsseite →
            </Link>
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
            Was Kunden fragen
          </h2>

          <div className="article-faq">
            <SemanticFaq items={data.faq} />
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--white fade-up d1"
      >
        <div className="article-section-inner">
          <span className="chapter-label">Qualität erkennen</span>
          <h2 className="section-h2">Woran erkennst du gute Arbeit?</h2>
          <div className="article-body">
            {data.qualitaet.map((q) => (
              <p key={q}>{q}</p>
            ))}
          </div>
        </div>
      </section>

      <div className="article-divider" aria-hidden />

      <section
        className="article-section content-section content-section--muted fade-up d2"
      >
        <div className="article-section-inner">
          <span className="chapter-label">München spezifisch</span>
          <h2 className="section-h2">Besonderheiten in München</h2>
          <div className="article-body">
            {data.muenchen.map((m) => {
              const { icon, text } = splitIconText(m);
              return (
                <p key={m}>
                  {icon ? (
                    <span style={{ marginRight: "8px" }} aria-hidden>
                      {icon}
                    </span>
                  ) : null}
                  {text}
                </p>
              );
            })}
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
          <Link href={leistungUrl} className="final-cta-link">
            Zur Leistungsseite →
          </Link>
        </div>
      </div>
    </div>
  );
}
