import Link from "next/link";

import { SemanticFaq } from "@/components/common/SemanticFaq";
import { StadtteilLinksSection } from "@/components/handwerker/StadtteilLinksSection";
import { SITE_CONFIG } from "@/lib/config";
import {
  getStadtteilLinks,
  handwerkerLeistungKeysFromRechnerSlug,
  stadtteilSectionLabel,
} from "@/lib/handwerker-stadtteil";
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

const DEFAULT_SECTION_H2 = {
  ablauf: "So läuft das ab",
  voraussetzungen: "Was du vorher wissen solltest",
  optionen: "Welche Optionen gibt es?",
  kosten: "Was kostet das wirklich?",
  zeit: "Wie lange dauert das?",
  faq: "Was Kunden fragen",
  qualitaet: "Woran erkennst du gute Arbeit?",
  muenchen: "Besonderheiten in München",
} as const;

function sectionH2(
  data: RatgeberData,
  key: keyof typeof DEFAULT_SECTION_H2
): string {
  return data.sectionH2?.[key] ?? DEFAULT_SECTION_H2[key];
}

function splitIconText(line: string): { icon: string; text: string } {
  const sp = line.indexOf(" ");
  if (sp > 0) {
    return { icon: line.slice(0, sp), text: line.slice(sp + 1).trim() };
  }
  return { icon: "", text: line };
}

function phoneDisplay(): string {
  const raw = SITE_CONFIG.phone.replace(/\s/g, "");
  if (raw.length === 11 && raw.startsWith("089")) {
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
  }
  return SITE_CONFIG.phone;
}

export interface RatgeberPageProps {
  data: RatgeberData;
}

export function RatgeberPage({ data }: RatgeberPageProps) {
  const isGuide = data.layout === "guide";
  const lesezeit = ratgeberReadingMinutes(data);
  const updated = new Date(data.dateModified).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const kontaktHref = "/kontakt";
  const leistungUrl = leistungHref(data.leistungsSlug);
  const rechnerCtaLabel =
    data.ctaRechnerLabel ?? "Kontakt für mein Projekt aufnehmen →";
  const phoneLabel = `Jetzt anrufen — ${phoneDisplay()}`;

  const wbPunkte = data.wannBrauche.punkte;
  const showIntro = !isGuide && wbPunkte.length > 0;
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

  const handwerkerKeys = handwerkerLeistungKeysFromRechnerSlug(data.leistungsSlug);
  const stadtteilLinks = getStadtteilLinks(handwerkerKeys);
  const stadtteilLabel = stadtteilSectionLabel(handwerkerKeys);

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
            <span>München 2026</span>
            <span>Lesezeit: ca. {lesezeit} Min.</span>
            <span>Update: {updated}</span>
          </div>
        </div>
      </div>

      <div className="content-section content-section--white fade-up d1 ratgeber-kurze-antwort-wrap">
        <div className="article-section-inner">
          <p className="ratgeber-kurze-antwort-label">Kurze Antwort</p>
          <div className="hinweis ratgeber-kurze-antwort">
            <p>{data.kurzeAntwort}</p>
          </div>
        </div>
      </div>

      {isGuide ? (
        <div className="content-section content-section--white fade-up d1 ratgeber-guide-cta-wrap">
          <div
            className="article-section-inner"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              paddingTop: 0,
            }}
          >
            {data.finalCtaPhoneFirst ? (
              <Link href={telHref} className="page-hero-btn-primary">
                {phoneLabel}
              </Link>
            ) : null}
            <Link
              href={kontaktHref}
              className={
                data.finalCtaPhoneFirst
                  ? "page-hero-btn-secondary"
                  : "page-hero-btn-primary"
              }
            >
              {rechnerCtaLabel}
            </Link>
          </div>
        </div>
      ) : null}

      {showIntro ? (
        <>
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
        </>
      ) : null}

      <section
        className="article-section content-section content-section--muted fade-up d2"
      >
        <div className="article-section-inner">
          {!isGuide ? (
            <>
              <span className="chapter-label">Schritt für Schritt</span>
              <h2 className="section-h2">{sectionH2(data, "ablauf")}</h2>
            </>
          ) : null}

          <div className={isGuide ? "guide-qa-list" : "ablauf-timeline"}>
            {!isGuide ? (
              <div className="ablauf-timeline-line" aria-hidden />
            ) : null}
            {data.ablauf.map((s, i) => (
              <div
                key={s.schritt}
                className={isGuide ? "guide-qa-item fade-up" : "ablauf-step fade-up"}
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                {!isGuide ? <div className="ablauf-step-num">{i + 1}</div> : null}
                {isGuide ? (
                  <h2 className="section-h2 guide-qa-question">{s.schritt}</h2>
                ) : (
                  <h3 className="ablauf-step-title">{s.schritt}</h3>
                )}
                <p
                  className={
                    isGuide ? "article-body guide-qa-answer" : "ablauf-step-text"
                  }
                  style={isGuide ? { whiteSpace: "pre-line" } : undefined}
                >
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isGuide ? <div className="article-divider" aria-hidden /> : null}

      {!isGuide && data.voraussetzungen.length > 0 ? (
        <>
          <section className="article-section content-section content-section--white fade-up d3">
            <div className="article-section-inner">
              <span className="chapter-label">
                {sectionH2(data, "voraussetzungen")}
              </span>
              <div className="article-body">
                {data.voraussetzungen.map((v) => (
                  <p key={v}>{v}</p>
                ))}
              </div>
            </div>
          </section>
          <div className="article-divider" aria-hidden />
        </>
      ) : null}

      {!isGuide && data.materialien.length > 0 ? (
        <>
          <section className="article-section content-section content-section--muted fade-up d4">
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
        </>
      ) : null}

      {!isGuide && data.kosten.von > 0 && data.kosten.bis > 0 ? (
        <>
          <section className="article-section content-section content-section--white fade-up d1">
            <div className="article-section-inner">
              <span className="chapter-label">Preise München 2026</span>
              <h2 className="section-h2">{sectionH2(data, "kosten")}</h2>
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
                  Alle Preise sind Richtwerte für München 2026. Der genaue Preis
                  hängt von Zustand, Zugänglichkeit und Materialwahl ab — beim
                  Vor-Ort-Termin nennen wir einen festen Preis.
                </p>
              </div>
              <Link
                href={kontaktHref}
                className="page-hero-btn-primary"
                style={{ display: "inline-block", marginTop: "20px" }}
              >
                {rechnerCtaLabel}
              </Link>
            </div>
          </section>
          <div className="article-divider" aria-hidden />
        </>
      ) : null}

      {!isGuide && data.zeitaufwand.klein ? (
        <>
          <section
            className="article-section--sm content-section content-section--muted fade-up d2"
            style={{ padding: "48px 2rem" }}
          >
            <div className="article-section-inner">
              <span className="chapter-label">Zeitaufwand</span>
              <h2 className="section-h2">{sectionH2(data, "zeit")}</h2>
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
        </>
      ) : null}

      {isGuide ? <div className="article-divider" aria-hidden /> : null}

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
            {sectionH2(data, "faq")}
          </h2>

          <div className="article-faq">
            <SemanticFaq items={data.faq} />
          </div>
        </div>
      </section>

      {!isGuide && data.qualitaet.length > 0 ? (
        <>
          <div className="article-divider" aria-hidden />
          <section className="article-section content-section content-section--white fade-up d1">
            <div className="article-section-inner">
              <span className="chapter-label">Qualität erkennen</span>
              <h2 className="section-h2">{sectionH2(data, "qualitaet")}</h2>
              <div className="article-body">
                {data.qualitaet.map((q) => (
                  <p key={q}>{q}</p>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {!isGuide && data.muenchen.length > 0 ? (
        <>
          <div className="article-divider" aria-hidden />
          <section className="article-section content-section content-section--muted fade-up d2">
            <div className="article-section-inner">
              <span className="chapter-label">München spezifisch</span>
              <h2 className="section-h2">{sectionH2(data, "muenchen")}</h2>
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
        </>
      ) : null}

      {data.relatedLinks && data.relatedLinks.length > 0 ? (
        <>
          <div className="article-divider" aria-hidden />
          <section className="article-section content-section content-section--white fade-up d2">
            <div className="article-section-inner">
              <span className="chapter-label">Weiterlesen</span>
              <h2 className="section-h2">Passende Ratgeber</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "16px",
                }}
              >
                {data.relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="koordination-box-link">
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <StadtteilLinksSection
        links={stadtteilLinks}
        leistungLabel={stadtteilLabel}
      />

      <div className="final-cta-section">
        <div className="final-cta-bg">BW</div>
        <div className="final-cta-inner">
          <h2 className="final-cta-h2">Bereit für dein Projekt?</h2>
          <p className="final-cta-sub">
            Melde dich direkt bei uns — wir besprechen die beste Lösung.
          </p>
          <div className="final-cta-btns">
            {data.finalCtaPhoneFirst ? (
              <>
                <Link href={telHref} className="final-cta-btn-primary">
                  {phoneLabel}
                </Link>
                <Link href={kontaktHref} className="final-cta-btn-ghost">
                  {rechnerCtaLabel}
                </Link>
              </>
            ) : (
              <>
                <Link href={kontaktHref} className="final-cta-btn-primary">
                  {rechnerCtaLabel}
                </Link>
                <Link href={telHref} className="final-cta-btn-ghost">
                  Direkt anrufen
                </Link>
              </>
            )}
          </div>
          <Link href={leistungUrl} className="final-cta-link">
            Zur Leistungsseite →
          </Link>
        </div>
      </div>
    </div>
  );
}
