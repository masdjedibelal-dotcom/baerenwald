import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { TeoRechtsSeite } from "@/components/teo/TeoRechtsSeite";
import { istTeo, MARKE } from "@/lib/marke";
import { ANBIETER } from "@/lib/recht-anbieter";

export const metadata: Metadata = {
  title: `Impressum — ${MARKE.nameLang}`,
  robots: "noindex",
};

function Inhalt() {
  return (
    <>
      <strong>Angaben gemäß § 5 DDG</strong>
      <p>
        {ANBIETER.name}
        <br />
        {ANBIETER.rechtsform}
        <br />
        {ANBIETER.strasse}
        <br />
        {ANBIETER.ortZeile}
      </p>
      {ANBIETER.vertreten ? <p>Vertreten durch die Gesellschafter: {ANBIETER.vertreten}</p> : null}

      <strong>Kontakt</strong>
      <p>
        {ANBIETER.telefon ? (
          <>
            Telefon: <a href={ANBIETER.telefon.href}>{ANBIETER.telefon.anzeige}</a>
            <br />
          </>
        ) : null}
        {ANBIETER.mobil ? (
          <>
            Mobil: <a href={ANBIETER.mobil.href}>{ANBIETER.mobil.anzeige}</a>
            <br />
          </>
        ) : null}
        E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
      </p>

      <strong>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</strong>
      <p>
        {ANBIETER.vertreten ?? ANBIETER.name}
        <br />
        {ANBIETER.strasse}
        <br />
        {ANBIETER.ortZeile}
      </p>

      <strong>Haftung für Inhalte</strong>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen
        Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir
        als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
        Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>

      <strong>Haftung für Links</strong>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
        keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
        Anbieter oder Betreiber verantwortlich.
      </p>

      <strong>Urheberrecht</strong>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
        unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
        Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
        bedürfen der schriftlichen Zustimmung des jeweiligen Autors.
      </p>

      <strong>Streitschlichtung / Verbraucherschlichtung (VSBG)</strong>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
        bereit:{' '}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </p>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle im Sinne des
        Verbraucherstreitbeilegungsgesetzes (VSBG) teilzunehmen.
      </p>
    </>
  );
}

export default function ImpressumPage() {
  if (istTeo) {
    return (
      <TeoRechtsSeite titel="Impressum" stand="Stand: Mai 2026">
        <Inhalt />
      </TeoRechtsSeite>
    );
  }
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
              <span className="breadcrumb-current">Impressum</span>
            </nav>
            <h1 className="page-hero-h1">Impressum</h1>
            <p className="page-hero-sub">Stand: Mai 2026</p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <Inhalt />
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
