import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";

export const metadata: Metadata = {
  title: "Über uns — Bärenwald München",
  description:
    "Handwerk in München — Praxis, Prozesse und Koordination. Ein Ansprechpartner, klare Abläufe, dokumentierte Projekte.",
};

const PROCESS_ITEMS = [
  "Checklisten",
  "Foto-Dokumentation",
  "Klare Prozesse",
  "Übergaben",
  "Zeitplanung",
  "Interne Koordination",
] as const;

const ENABLES_ITEMS = [
  "Kunden absichern",
  "Reklamationen nachvollziehen",
  "Haftung dokumentieren",
  "Betriebe entlasten",
  "Zeit sparen",
  "Fehler reduzieren",
] as const;

const CLOSING_BULLETS = [
  "Ein Ansprechpartner",
  "Klare Prozesse",
  "Dokumentierte Projekte",
  "Verantwortung auf\nbeiden Seiten",
] as const;

export default function UeberUnsPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>
                ›
              </span>
              <span className="breadcrumb-current">Über uns</span>
            </nav>
            <h1 className="page-hero-h1">
              Handwerk in München —
              <br />
              einfach, transparent, digital.
            </h1>
            <p className="page-hero-sub">
              Wir verstehen sowohl die
              <br />
              Kundenseite als auch die
              <br />
              Baustellenseite.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <h2>Warum Bärenwald?</h2>
              <p>
                Früher funktionierte vieles über Vertrauen, Erfahrung und Menschen
                die mitgedacht haben. Heute scheitern viele Projekte nicht am
                Handwerk selbst — sondern an fehlender Abstimmung, Zeitdruck und
                unklaren Verantwortlichkeiten.
              </p>
              <p>
                Genau deshalb verbindet Bärenwald echte Baustellenpraxis mit
                modernen Prozessen.
              </p>

              <h2>Unser Ansatz</h2>
              <p>
                Wir wollen nicht einfach Handwerker vermitteln wie ein normales
                Portal. Wir wollen Handwerk, Koordination und Prozesse in ein
                nachvollziehbares System bringen.
              </p>
              <p>
                Der Kunde erklärt sein Anliegen in seiner Sprache. Wir übersetzen
                dieses Anliegen fachlich richtig für den passenden
                Handwerksbetrieb.
              </p>
              <p>
                Wir planen Betriebe nicht nach Bewertungen oder Werbung ein —
                sondern nach echten Fähigkeiten, Erfahrung, Kapazität und
                Kompetenz.
              </p>
              <div className="ueber-uns-example-box">
                <div className="ueber-uns-example-box-text whitespace-pre-line">
                  {`Ein Sanitärbetrieb kann sehr stark in Heizungsanlagen sein, aber schwach in Badsanierung.
Ein anderer Betrieb baut perfekte Bäder, aber macht keine komplexen Heizungen.
Genau diese Unterschiede verstehen wir durch unsere eigene Praxis.`}
                </div>
              </div>

              <h2>Aus eigener Praxis</h2>
              <p>
                Aus eigenen Gewerken — Hausmeisterservice, Gartenbau, Reinigung —
                entstanden über Jahre feste Abläufe, Checklisten und dokumentierte
                Prozesse. Daraus entwickelte sich ein Netzwerk aus festen
                Partnerfirmen, Meisterbetrieben und eigenen Teams.
              </p>
              <p>
                Dadurch kennen wir echte Abläufe auf Baustellen und wissen wo
                Probleme entstehen.
              </p>

              <h2>Wie wir arbeiten</h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
                <div>
                  <h3 className="ueber-uns-list-heading">Unser Prozess</h3>
                  <ul className="ueber-uns-checklist">
                    {PROCESS_ITEMS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="ueber-uns-list-heading">Das ermöglicht</h3>
                  <ul className="ueber-uns-checklist">
                    {ENABLES_ITEMS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="ueber-uns-pullquote whitespace-pre-line">
                {`Nicht Chaos.
Nicht zehn Ansprechpartner.
Nicht Suchen.

Sondern ein strukturierter Ablauf zwischen Kunde, Handwerk und Umsetzung.`}
              </div>
              <ul className="ueber-uns-checklist ueber-uns-checklist--centered">
                {CLOSING_BULLETS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <div
                className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-16"
                role="group"
                aria-label="Nächste Schritte"
              >
                <Link
                  href="/rechner"
                  className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]"
                >
                  Angebot anfordern →
                </Link>
                <Link
                  href="/leistungen"
                  className="inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-muted"
                >
                  Alle Leistungen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
