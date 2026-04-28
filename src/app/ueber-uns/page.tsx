import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";

export const metadata: Metadata = {
  title: "Über uns — Bärenwald München",
  description:
    "Handwerk in München — einfach, transparent, digital. Eine Anfrage, ein Ansprechpartner.",
};

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
              Handwerk in München —<br />
              einfach, transparent, digital.
            </h1>
            <p className="page-hero-sub">
              Eine Anfrage. Ein Ansprechpartner.
              <br />
              Egal ob eine Leistung oder
              <br />
              ein komplettes Projekt.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <h2>Aus München. Für München.</h2>
              <p>
                Wir haben Bärenwald 2020 gegründet — aus eigener Erfahrung. Als
                Münchner wissen wir wie es sich anfühlt wenn Handwerker nicht
                erscheinen, Preise unklar bleiben und niemand den Überblick
                behält.
              </p>
              <p>
                Seitdem haben wir in München und Umgebung Schritt für Schritt
                mehr Projekte übernommen — vom einzelnen Malerauftrag bis zur
                kompletten Renovierung. Jedes Projekt sauber abgeschlossen.
                Jeder Kunde mit einem Ansprechpartner.
              </p>

              <h2>Eine Anfrage. Alles geregelt.</h2>
              <p>
                Ob ihr nur streichen lassen wollt oder Bad, Boden und Elektrik
                auf einmal — wir koordinieren alle Gewerke und halten euch
                digital auf dem Stand.
              </p>
              <p>
                Kein Suchen nach einzelnen Betrieben. Kein Koordinieren wer wann
                kommt. Kein Rätseln was es kostet.
              </p>
              <p>
                Ihr seht den Preisrahmen sofort — noch bevor ihr anruft. Nach
                dem Vor-Ort-Termin ein verbindliches Angebot. Am Ende ein
                digitales Protokoll.
              </p>

              <h2>Was wir machen</h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                <a href="/leistungen/malerarbeiten-muenchen">Streichen &amp; Tapezieren</a>
                <a href="/leistungen/badezimmer-sanierung-muenchen">Neues Bad</a>
                <a href="/leistungen/bodenbelag-muenchen">Neuer Boden</a>
                <a href="/leistungen/fenster-tueren-muenchen">Fenster &amp; Türen</a>
                <a href="/leistungen/trockenbau-muenchen">Neue Wände &amp; Decken</a>
                <a href="/leistungen/heizung-sanitaer-muenchen">Heizung &amp; Wasser</a>
                <a href="/leistungen/elektroarbeiten-muenchen">Strom &amp; Licht</a>
                <a href="/leistungen/dacharbeiten-muenchen">Dach &amp; Regenrinnen</a>
                <a href="/leistungen/gartenpflege-muenchen">Gartenpflege &amp; Gestaltung</a>
                <a href="/leistungen/hausmeisterservice-muenchen">Hausmeisterservice</a>
                <a href="/leistungen/gebaeudereinigung-muenchen">Gebäudereinigung</a>
                <a href="/leistungen/winterdienst-muenchen">Winterdienst</a>
                <a href="/rechner?situation=kaputt">Notfalleinsätze</a>
              </div>

              <p className="mt-8 flex flex-wrap gap-3">
                <Link href="/kontakt" className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]">
                  Angebot anfordern →
                </Link>
                <Link
                  href="/leistungen"
                  className="inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-muted"
                >
                  Alle Leistungen
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
