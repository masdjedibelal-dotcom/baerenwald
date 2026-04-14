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

function splitIconText(line: string): { icon: string; text: string } {
  const sp = line.indexOf(" ");
  if (sp > 0) {
    return { icon: line.slice(0, sp), text: line.slice(sp + 1).trim() };
  }
  return { icon: "📍", text: line };
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
  const rechnerHref = `/rechner?situation=${encodeURIComponent(data.rechnerSituation)}`;
  const leistungUrl = leistungHref(data.leistungsSlug);
  const fk = data.kosten.faktoren;
  const half = Math.ceil(fk.length / 2);
  const faktorenLinks = fk.slice(0, half);
  const faktorenRechts = fk.slice(half);

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
          <div className="ratgeber-tag">Ratgeber & Kosten</div>
          <h1 className="page-hero-h1">{data.hero.headline}</h1>
          <p className="page-hero-sub">{data.hero.subline}</p>
          <div className="ratgeber-meta">
            <span>München 2024/25</span>
            <span>Lesezeit: ca. {lesezeit} Min.</span>
            <span>Letztes Update: {updated}</span>
          </div>
        </div>
      </div>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d1">
          <h2 className="section-h2">{data.wannBrauche.title}</h2>
          <ul className="check-list">
            {data.wannBrauche.punkte.map((p) => (
              <li key={p}>
                <span className="check-list-icon">
                  <CheckIcon />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d2">
          <h2 className="section-h2">So läuft das ab</h2>
          <p className="section-sub">
            Von der Anfrage bis zur Abnahme — typischer Ablauf in München.
          </p>
          <div className="ablauf-timeline">
            <div className="ablauf-timeline-line" aria-hidden />
            {data.ablauf.map((s, i) => (
              <div key={s.schritt} className="ablauf-step">
                <div className="ablauf-step-num">{i + 1}</div>
                <h3 className="ablauf-step-title">{s.schritt}</h3>
                <p className="ablauf-step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d3">
          <h2 className="section-h2">Was du vorher wissen solltest</h2>
          <ul className="check-list">
            {data.voraussetzungen.map((v) => (
              <li key={v}>
                <span className="check-list-icon">
                  <CheckIcon />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d4">
          <h2 className="section-h2">Materialien & Varianten</h2>
          <p className="section-sub">
            Übersicht über gängige Optionen — dein Festpreis ergibt sich aus
            Umfang und Materialwahl.
          </p>
          <div className="material-grid">
            {data.materialien.map((m) => (
              <div key={m.name} className="material-card">
                <div className="material-card-name">{m.name}</div>
                <p className="material-card-desc">{m.beschreibung}</p>
                <span className="material-card-price">{m.vonBis}</span>
                <div className="material-card-for">
                  Geeignet für: {m.fuer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d1">
          <h2 className="section-h2">Was kostet das in München?</h2>
          <div className="preis-box">
            <div className="preis-box-head">Richtwert München 2024/25</div>
            <div className="preis-box-body">
              <div className="preis-range">
                <span className="preis-range-value">
                  {formatEuro(data.kosten.von)} – {formatEuro(data.kosten.bis)}{" "}
                  €
                </span>
                <span className="preis-range-unit">{data.kosten.einheit}</span>
              </div>
              <div className="kosten-split">
                <div>
                  <p
                    className="section-eyebrow section-eyebrow--muted"
                    style={{ marginBottom: "8px" }}
                  >
                    Was den Preis erhöht
                  </p>
                  <ul className="kosten-list">
                    {faktorenLinks.map((f) => (
                      <li key={f}>
                        <span className="kosten-list-dot" aria-hidden>
                          •
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {faktorenRechts.length > 0 ? (
                    <>
                      <p
                        className="section-eyebrow section-eyebrow--muted"
                        style={{ marginBottom: "8px" }}
                      >
                        Weitere Faktoren
                      </p>
                      <ul className="kosten-list">
                        {faktorenRechts.map((f) => (
                          <li key={f}>
                            <span className="kosten-list-dot" aria-hidden>
                              •
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p
                    className="section-eyebrow section-eyebrow--muted"
                    style={{
                      marginBottom: "8px",
                      marginTop: faktorenRechts.length ? "16px" : 0,
                    }}
                  >
                    Beispielkalkulation
                  </p>
                  <div className="preis-hint" style={{ marginTop: 0 }}>
                    {data.kosten.beispiel}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Link
            href={rechnerHref}
            className="page-hero-btn-primary"
            style={{ marginTop: "16px", display: "inline-block" }}
          >
            Preis für mein Projekt berechnen →
          </Link>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d2">
          <h2 className="section-h2">Wie lange dauert das?</h2>
          <div className="zeit-grid">
            <div className="zeit-card">
              <div className="zeit-card-label">Klein</div>
              <div className="zeit-card-value">{data.zeitaufwand.klein}</div>
            </div>
            <div className="zeit-card">
              <div className="zeit-card-label">Mittel</div>
              <div className="zeit-card-value">{data.zeitaufwand.mittel}</div>
            </div>
            <div className="zeit-card">
              <div className="zeit-card-label">Groß</div>
              <div className="zeit-card-value">{data.zeitaufwand.gross}</div>
            </div>
          </div>
          <h3
            className="section-eyebrow section-eyebrow--muted"
            style={{ marginTop: "28px" }}
          >
            Was die Dauer beeinflusst
          </h3>
          <ul className="check-list">
            {data.zeitaufwand.faktoren.map((f) => (
              <li key={f}>
                <span className="check-list-icon">
                  <CheckIcon />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d3">
          <div className="koordination-box">
            <div>
              <h2 className="section-h2" style={{ marginBottom: "10px" }}>
                Was wir koordinieren
              </h2>
              <p className="koordination-box-text">{data.koordination}</p>
            </div>
            <Link href={leistungUrl} className="koordination-box-link">
              Zur Leistungsseite →
            </Link>
          </div>
          <div className="koordination-usps">
            {data.koordinationUsps.map((u) => (
              <div key={u} className="koordination-usp">
                {u}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner">
          <div
            className="faq-inner fade-up d4"
            style={{ gridTemplateColumns: "1fr 2fr" }}
          >
            <div>
              <h2 className="section-h2">Häufige Fragen</h2>
            </div>
            <SemanticFaq items={data.faq} />
          </div>
        </div>
      </section>

      <section className="content-section content-section--white">
        <div className="content-section-inner fade-up d1">
          <h2 className="section-h2">Woran erkennst du gute Qualität?</h2>
          <p className="section-sub">
            Diese Punkte solltest du bei der gemeinsamen Kontrolle am Ende
            prüfen.
          </p>
          <ul className="qualitaet-list">
            {data.qualitaet.map((q) => (
              <li key={q} className="qualitaet-item">
                <div className="qualitaet-dot" aria-hidden />
                {q}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section content-section--muted">
        <div className="content-section-inner fade-up d2">
          <h2 className="section-h2">Besonderheiten in München</h2>
          <p className="section-sub">
            Typische Rahmenbedingungen in der Region — kurz zusammengefasst.
          </p>
          <div className="muenchen-grid">
            {data.muenchen.map((m) => {
              const { icon, text } = splitIconText(m);
              return (
                <div key={m} className="muenchen-item">
                  <span className="muenchen-item-icon" aria-hidden>
                    {icon}
                  </span>
                  {text}
                </div>
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
          <Link href={leistungUrl} className="final-cta-link">
            Zur Leistungsseite →
          </Link>
        </div>
      </div>
    </div>
  );
}
