import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Datenschutz — Bärenwald München",
  robots: "noindex",
};

export default function DatenschutzPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        {/* Hero */}
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>›</span>
              <span className="breadcrumb-current">Datenschutz</span>
            </nav>
            <h1 className="page-hero-h1">Datenschutzerklärung</h1>
            <p className="page-hero-sub">Stand: April 2026</p>
          </div>
        </div>

        {/* Inhalt */}
        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <strong>1. Verantwortlicher</strong>
              <p>
                Beran Cakmak<br />
                Bärenwaldstraße 20<br />
                81737 München<br />
                E-Mail:{" "}
                <a href="mailto:info@baerenwald-muenchen.de">
                  info@baerenwald-muenchen.de
                </a>
                <br />
                Telefon (Festnetz):{" "}
                <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
                <br />
                Mobil:{" "}
                <a href={SITE_CONFIG.phoneMobilHref}>{SITE_CONFIG.phoneMobil}</a>
              </p>

              <strong>2. Erhebung und Speicherung personenbezogener Daten</strong>
              <p>
                Wenn Sie unsere Website besuchen, werden automatisch Informationen allgemeiner Natur
                erfasst. Diese Informationen umfassen die Art des Webbrowsers, das verwendete
                Betriebssystem, den Domainnamen Ihres Internet-Service-Providers sowie ähnliches.
              </p>
              <p>
                Dies dient ausschließlich der Verbesserung unseres Internetauftritts und ermöglicht
                keine Rückschlüsse auf Ihre Person.
              </p>

              <strong>3. Kontaktformular und Preisrechner</strong>
              <p>
                Wenn Sie uns über das Kontaktformular oder den Preisrechner eine Anfrage zukommen
                lassen, werden Ihre Angaben aus dem Formular inklusive der von Ihnen dort
                angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von
                Anschlussfragen bei uns gespeichert.
              </p>
              <p>Folgende Daten werden erhoben:</p>
              <ul>
                <li>Vor- und Nachname</li>
                <li>Telefonnummer</li>
                <li>E-Mail-Adresse (optional)</li>
                <li>Projektbeschreibung</li>
                <li>Hochgeladene Fotos / Videos</li>
                <li>PLZ und Standort</li>
                <li>Projektdetails aus dem Rechner</li>
              </ul>
              <p>
                Diese Daten werden ausschließlich zur Bearbeitung Ihrer Anfrage verwendet und nicht
                an Dritte weitergegeben.
              </p>
              <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung)</p>

              <strong>4. Weitergabe von Daten</strong>
              <p>Eine Übermittlung Ihrer persönlichen Daten an Dritte findet nicht statt, außer:</p>
              <ul>
                <li>
                  Zur Erfüllung des Auftrags an beteiligte Handwerksbetriebe, soweit dies zur
                  Durchführung notwendig ist
                </li>
                <li>Wenn Sie ausdrücklich eingewilligt haben</li>
                <li>Wenn wir gesetzlich dazu verpflichtet sind</li>
              </ul>

              <strong>5. Speicherdauer</strong>
              <p>
                Ihre Daten werden gelöscht sobald sie für den Zweck ihrer Erhebung nicht mehr
                erforderlich sind. Bei Anfragen über das Kontaktformular ist dies der Fall, wenn
                die jeweilige Konversation beendet ist und keine Geschäftsbeziehung zustande kommt.
              </p>
              <p>
                Bei Auftragserteilung werden die Daten entsprechend der gesetzlichen
                Aufbewahrungsfristen gespeichert (in der Regel 10 Jahre).
              </p>

              <strong>6. Hosting</strong>
              <p>
                Diese Website wird gehostet bei Vercel Inc., 340 Pine Street, Suite 900,
                San Francisco, CA 94104, USA.
              </p>
              <p>
                Vercel ist zertifiziert nach dem EU-US Data Privacy Framework. Weitere
                Informationen:{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  vercel.com/legal/privacy-policy
                </a>
              </p>

              <strong>7. CRM und Kommunikation</strong>
              <p>
                Zur Verwaltung von Kundenanfragen nutzen wir HubSpot (HubSpot Inc., 25 First
                Street, Cambridge, MA 02141, USA).
              </p>
              <p>
                HubSpot ist zertifiziert nach dem EU-US Data Privacy Framework. Weitere
                Informationen:{" "}
                <a
                  href="https://legal.hubspot.com/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  legal.hubspot.com/privacy-policy
                </a>
              </p>

              <strong>8. Ihre Rechte</strong>
              <p>Sie haben jederzeit das Recht:</p>
              <ul>
                <li>Auskunft über Ihre gespeicherten Daten zu erhalten</li>
                <li>Ihre Daten berichtigen zu lassen</li>
                <li>Ihre Daten löschen zu lassen</li>
                <li>Der Verarbeitung zu widersprechen</li>
                <li>Datenübertragbarkeit zu verlangen</li>
              </ul>
              <p>
                Zur Ausübung dieser Rechte wenden Sie sich an:{" "}
                <a href="mailto:info@baerenwald-muenchen.de">info@baerenwald-muenchen.de</a>
              </p>

              <strong>9. Beschwerderecht</strong>
              <p>
                Sie haben das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren:
              </p>
              <p>
                Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
                Promenade 27<br />
                91522 Ansbach<br />
                <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
                  www.lda.bayern.de
                </a>
              </p>

              <strong>10. Änderungen dieser Datenschutzerklärung</strong>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
                aktuellen rechtlichen Anforderungen entspricht.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
