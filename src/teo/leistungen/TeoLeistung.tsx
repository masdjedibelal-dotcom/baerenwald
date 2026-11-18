import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TEO_LINK_ANFRAGE, TeoRahmen } from "@/components/teo/TeoRahmen";
import { MARKE, MARKE_WEBSITE_URL } from "@/lib/marke";
import { leistungPfad, TEO_LEISTUNGEN, type TeoLeistung } from "@/teo/leistungen/leistungen";
import { TeoRatgeberKarte } from "@/teo/ratgeber/TeoRatgeber";
import { ratgeberArtikel, type RatgeberArtikel } from "@/teo/ratgeber/artikel";

import "@/app/teo-ratgeber.css";

function JsonLd({ daten }: { daten: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(daten) }} />;
}

/** Karte „weitere Leistung“ im Stil der Ratgeber-Karten */
export function TeoLeistungKarte({ l }: { l: TeoLeistung }) {
  return (
    <Link href={leistungPfad(l.slug)} className="tr-karte">
      <span className="tr-karte__kat">Leistung</span>
      <h3>{l.name}</h3>
      <p>{l.beschreibung}</p>
      <span className="tr-karte__fuss">
        Mehr erfahren
        <ArrowRight size={16} className="tr-karte__pfeil" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** servus-teo.de/leistungen/[slug] — eine Leistung für Hausverwaltungen */
export function TeoLeistungSeite({ l }: { l: TeoLeistung }) {
  const url = `${MARKE_WEBSITE_URL}${leistungPfad(l.slug)}`;
  const anfrageHref = l.anfrage.situation ? `${TEO_LINK_ANFRAGE}?s=${l.anfrage.situation}` : TEO_LINK_ANFRAGE;
  const ratgeber = l.ratgeber.map(ratgeberArtikel).filter((x): x is RatgeberArtikel => Boolean(x));
  const weitere = TEO_LEISTUNGEN.filter((x) => x.slug !== l.slug);
  return (
    <TeoRahmen>
      <JsonLd
        daten={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: l.titel,
            description: l.beschreibung,
            serviceType: l.name,
            areaServed: { "@type": "City", name: "München" },
            audience: { "@type": "BusinessAudience", audienceType: "Hausverwaltungen und Eigentümergemeinschaften" },
            provider: { "@type": "Organization", name: MARKE.nameLang, url: MARKE_WEBSITE_URL },
            url,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: l.faq.map((f) => ({ "@type": "Question", name: f.frage, acceptedAnswer: { "@type": "Answer", text: f.antwort } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Startseite", item: MARKE_WEBSITE_URL },
              { "@type": "ListItem", position: 2, name: "Leistungen", item: `${MARKE_WEBSITE_URL}/#leistungen` },
              { "@type": "ListItem", position: 3, name: l.name, item: url },
            ],
          },
        ]}
      />
      <article className="teo-innen tr-artikel">
        <nav className="tr-pfad" aria-label="Brotkrumen">
          <Link href="/#leistungen">Leistungen</Link>
          <span aria-hidden="true">/</span>
          <span>{l.name}</span>
        </nav>
        <h1>{l.titel}</h1>

        <div className="tr-kurz">
          <b>Kurz gesagt</b>
          <p>{l.kurz}</p>
        </div>

        <div className="tr-text">
          <section id="leistungen">
            <h2>Was wir übernehmen</h2>
            <ul>
              {l.uebernehmen.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {l.gewerke?.length ? (
              <p className="tl-gewerke">
                <b>Gewerke:</b> {l.gewerke.join(" · ")}
              </p>
            ) : null}
          </section>

          <section id="ablauf">
            <h2>So läuft es ab</h2>
            <ol className="tr-schritte">
              {l.ablauf.map((p) => (
                <li key={p.titel}>
                  <b>{p.titel}</b>
                  <span>{p.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="vorteile">
            <h2>Ihr Vorteil als Verwaltung</h2>
            <ul>
              {l.vorteile.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="tr-cta">
          <p>{l.anfrage.text}</p>
          <Link href={anfrageHref} className="teo-btn teo-btn--hell">
            Anfrage stellen
          </Link>
        </aside>

        <section className="tr-fragen">
          <h2>Häufige Fragen</h2>
          <div className="teo-faq">
            {l.faq.map((f) => (
              <details key={f.frage}>
                <summary>{f.frage}</summary>
                <p>{f.antwort}</p>
              </details>
            ))}
          </div>
        </section>

        {ratgeber.length ? (
          <section className="tr-verwandt">
            <h2>Passend aus dem Ratgeber</h2>
            <div className="tr-raster">
              {ratgeber.map((a) => (
                <TeoRatgeberKarte key={a.slug} a={a} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="tr-verwandt">
          <h2>Weitere Leistungen</h2>
          <div className="tr-raster">
            {weitere.map((x) => (
              <TeoLeistungKarte key={x.slug} l={x} />
            ))}
          </div>
        </section>
      </article>
    </TeoRahmen>
  );
}
