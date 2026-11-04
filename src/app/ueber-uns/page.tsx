import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";

export const metadata: Metadata = {
  title: "Über uns — Bärenwald München",
  description:
    "Generalunternehmer und Handwerksbetrieb in München: eigene Gewerke, Elektrotechnik unter Meisterleitung und rund 70 Partnerbetriebe. Ein Ansprechpartner, dokumentierte Projekte.",
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
  "Eigene Gewerke und\nFachpartner",
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
              Handwerkliche Praxis —
              <br />
              klare Organisation.
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
              <p className="text-base text-p2-sub mb-8">
                Bärenwald München ist Generalunternehmer und Handwerksbetrieb für
                Bau, Umbau und Sanierung in München und Umgebung. Wir verbinden
                eigene Ausführung mit der Koordination umfassender Bauvorhaben.
              </p>
              <h2>Eigene Kompetenz und ergänzende Fachpartner</h2>
              <p>
                Unsere eigenen Schwerpunkte liegen im Trockenbau, Bodenlegen,
                Abbruch, Garten- und Landschaftsbau sowie in der Elektrotechnik
                unter fachlicher Leitung unseres technischen Betriebsleiters und
                Elektromeisters.
              </p>
              <p>
                Je nach Projekt ergänzen wir die Mannschaft durch rund 70
                Partnerbetriebe, Bauleitung, Statik und erforderliche
                Fachplanung.
              </p>

              <h2>Können entscheidet</h2>
              <p>
                Wir wählen unsere Fachpartner nach ihrer Eignung für die konkrete
                Aufgabe aus. Erfahrung und Spezialisierung bilden die Grundlage.
                Danach stimmen wir Verfügbarkeit und Einsatz im Projekt ab.
              </p>
              <div className="ueber-uns-example-box">
                <div className="ueber-uns-example-box-text whitespace-pre-line">
                  {`Ein Sanitärbetrieb kann sehr stark in Heizungsanlagen sein, aber schwach in Badsanierung.
Ein anderer Betrieb baut perfekte Bäder, aber macht keine komplexen Heizungen.
Genau diese Unterschiede verstehen wir durch unsere eigene Praxis.`}
                </div>
              </div>

              <h2>Informationen zusammenführen</h2>
              <p>
                Unsere Mitarbeiter kümmern sich um Organisation und
                Projektdokumentation. Berichte, Fotos und wichtige Entscheidungen
                werden zentral zugeordnet. Das schafft nachvollziehbare Abläufe
                zwischen Kunde, Büro und Baustelle.
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
                  href="/rechner?modus=anfrage"
                  className="btn-pill-primary inline-flex py-2.5 px-5 text-fs-meta"
                >
                  Projekt anfragen →
                </Link>
                <Link
                  href="/partner/registrieren"
                  className="inline-flex items-center rounded-pill border border-border-default px-5 py-2.5 text-fs-meta font-semibold text-text-primary hover:bg-muted"
                >
                  Partnerbetrieb werden
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
