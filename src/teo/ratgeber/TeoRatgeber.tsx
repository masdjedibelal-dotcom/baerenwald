import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { TEO_LINK_ANFRAGE, TeoRahmen } from "@/components/teo/TeoRahmen";
import { MARKE, MARKE_WEBSITE_URL } from "@/lib/marke";
import {
  RATGEBER_KATEGORIEN,
  RATGEBER_PFAD,
  ratgeberArtikel,
  ratgeberPfad,
  TEO_RATGEBER,
  type RatgeberArtikel,
  type RatgeberBlock,
} from "@/teo/ratgeber/artikel";

import "@/app/teo-ratgeber.css";

const datumDe = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

function JsonLd({ daten }: { daten: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(daten) }} />;
}

export function TeoRatgeberKarte({ a }: { a: RatgeberArtikel }) {
  return (
    <Link href={ratgeberPfad(a.slug)} className="tr-karte">
      <span className="tr-karte__kat">{a.kategorie}</span>
      <h3>{a.titel}</h3>
      <p>{a.beschreibung}</p>
      <span className="tr-karte__fuss">
        <Clock size={14} aria-hidden="true" /> {a.lesezeitMin} Min. Lesezeit
        <ArrowRight size={16} className="tr-karte__pfeil" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** servus-teo.de/ratgeber — Übersicht nach Themen */
export function TeoRatgeberUebersicht() {
  const url = `${MARKE_WEBSITE_URL}${RATGEBER_PFAD}`;
  return (
    <TeoRahmen>
      <JsonLd
        daten={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Ratgeber für Verwaltungen — ${MARKE.nameLang}`,
            url,
            hasPart: TEO_RATGEBER.map((a) => ({ "@type": "Article", headline: a.titel, url: `${MARKE_WEBSITE_URL}${ratgeberPfad(a.slug)}` })),
          },
        ]}
      />
      <section className="tr-kopf">
        <div className="teo-innen">
          <h1>
            <span>Wissen für Verwaltungen.</span> <span className="tr-blau">Kurz und verlässlich.</span>
          </h1>
          <p>Prüffristen, Schäden, Eigentümergemeinschaft: Antworten auf die Fragen, die im Alltag mit Häusern in München wirklich auftauchen.</p>
        </div>
      </section>
      <div className="teo-innen tr-themen">
        {RATGEBER_KATEGORIEN.map((k) => {
          const liste = TEO_RATGEBER.filter((a) => a.kategorie === k);
          if (!liste.length) return null;
          return (
            <section key={k} className="tr-thema">
              <h2>{k}</h2>
              <div className="tr-raster">
                {liste.map((a) => (
                  <TeoRatgeberKarte key={a.slug} a={a} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </TeoRahmen>
  );
}

function Block({ b }: { b: RatgeberBlock }) {
  switch (b.typ) {
    case "text":
      return <p>{b.text}</p>;
    case "liste":
      return (
        <ul>
          {b.punkte.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      );
    case "schritte":
      return (
        <ol className="tr-schritte">
          {b.punkte.map((p) => (
            <li key={p.titel}>
              <b>{p.titel}</b>
              <span>{p.text}</span>
            </li>
          ))}
        </ol>
      );
    case "tabelle":
      return (
        <div className="tr-tabelle">
          <table>
            <thead>
              <tr>
                {b.kopf.map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.zeilen.map((z) => (
                <tr key={z.join("|")}>
                  {z.map((zelle, i) => (
                    <td key={i}>{zelle}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "hinweis":
      return <p className="tr-hinweis">{b.text}</p>;
  }
}

/** servus-teo.de/ratgeber/[slug] — ein Artikel: Kurzantwort, Inhalt, Fragen, passende Anfrage */
export function TeoRatgeberArtikel({ a }: { a: RatgeberArtikel }) {
  const url = `${MARKE_WEBSITE_URL}${ratgeberPfad(a.slug)}`;
  const verwandt = a.verwandt.map(ratgeberArtikel).filter((x): x is RatgeberArtikel => Boolean(x));
  const anfrageHref = a.anfrage.situation ? `${TEO_LINK_ANFRAGE}?s=${a.anfrage.situation}` : TEO_LINK_ANFRAGE;
  return (
    <TeoRahmen>
      <JsonLd
        daten={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.titel,
            description: a.beschreibung,
            datePublished: a.aktualisiert,
            dateModified: a.aktualisiert,
            inLanguage: "de-DE",
            author: { "@type": "Organization", name: MARKE.nameLang, url: MARKE_WEBSITE_URL },
            publisher: { "@type": "Organization", name: MARKE.nameLang, url: MARKE_WEBSITE_URL },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.frage, acceptedAnswer: { "@type": "Answer", text: f.antwort } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Startseite", item: MARKE_WEBSITE_URL },
              { "@type": "ListItem", position: 2, name: "Ratgeber", item: `${MARKE_WEBSITE_URL}${RATGEBER_PFAD}` },
              { "@type": "ListItem", position: 3, name: a.titel, item: url },
            ],
          },
        ]}
      />
      <article className="teo-innen tr-artikel">
        <nav className="tr-pfad" aria-label="Brotkrumen">
          <Link href={RATGEBER_PFAD}>Ratgeber</Link>
          <span aria-hidden="true">/</span>
          <span>{a.kategorie}</span>
        </nav>
        <h1>{a.titel}</h1>
        <p className="tr-meta">
          {a.lesezeitMin} Min. Lesezeit · Stand {datumDe(a.aktualisiert)}
        </p>

        <div className="tr-kurz">
          <b>Kurz gesagt</b>
          <p>{a.kurzantwort}</p>
        </div>

        {a.abschnitte.length > 2 ? (
          <nav className="tr-inhalt" aria-label="Inhalt">
            <b>Inhalt</b>
            <ol>
              {a.abschnitte.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.titel}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="tr-text">
          {a.abschnitte.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.titel}</h2>
              {s.bloecke.map((b, i) => (
                <Block key={i} b={b} />
              ))}
            </section>
          ))}
        </div>

        <aside className="tr-cta">
          <p>{a.anfrage.text}</p>
          <Link href={anfrageHref} className="teo-btn teo-btn--hell">
            Anfrage stellen
          </Link>
        </aside>

        <section className="tr-fragen">
          <h2>Häufige Fragen</h2>
          <div className="teo-faq">
            {a.faq.map((f) => (
              <details key={f.frage}>
                <summary>{f.frage}</summary>
                <p>{f.antwort}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="tr-rechtlich">
          Dieser Beitrag gibt einen allgemeinen Überblick und ersetzt keine Rechtsberatung im Einzelfall. Stand: {datumDe(a.aktualisiert)}.
        </p>

        {verwandt.length ? (
          <section className="tr-verwandt">
            <h2>Weiterlesen</h2>
            <div className="tr-raster">
              {verwandt.map((v) => (
                <TeoRatgeberKarte key={v.slug} a={v} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </TeoRahmen>
  );
}
