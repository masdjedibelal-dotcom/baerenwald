import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Impressum — Bärenwald München",
  robots: "noindex",
};

export default function ImpressumPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        {/* Hero */}
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>›</span>
              <span className="breadcrumb-current">Impressum</span>
            </nav>
            <h1 className="page-hero-h1">Impressum</h1>
            <p className="page-hero-sub">Stand: April 2026</p>
          </div>
        </div>

        {/* Inhalt */}
        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <strong>Angaben gemäß § 5 TMG</strong>
              <p>
                Beran Cakmak<br />
                Einzelunternehmen<br />
                Bärenwaldstraße 20<br />
                81737 München
              </p>

              <strong>Kontakt</strong>
              <p>
                Telefon (Festnetz):{" "}
                <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
                <br />
                Mobil:{" "}
                <a href={SITE_CONFIG.phoneMobilHref}>{SITE_CONFIG.phoneMobil}</a>
                <br />
                E-Mail:{" "}
                <a href="mailto:info@baerenwald-muenchen.de">
                  info@baerenwald-muenchen.de
                </a>
              </p>

              <strong>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</strong>
              <p>
                Beran Cakmak<br />
                Bärenwaldstraße 20<br />
                81737 München
              </p>

              <strong>Haftung für Inhalte</strong>
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
                Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
                als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
                rechtswidrige Tätigkeit hinweisen.
              </p>

              <strong>Haftung für Links</strong>
              <p>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
                keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
                Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
                Anbieter oder Betreiber der Seiten verantwortlich.
              </p>

              <strong>Urheberrecht</strong>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
                unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
                Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
                bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
