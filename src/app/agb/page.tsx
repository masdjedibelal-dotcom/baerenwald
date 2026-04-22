import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";

export const metadata: Metadata = {
  title: "AGB — Bärenwald München",
  robots: "noindex",
};

export default function AgbPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        {/* Hero */}
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>›</span>
              <span className="breadcrumb-current">AGB</span>
            </nav>
            <h1 className="page-hero-h1">Allgemeine Geschäftsbedingungen</h1>
            <p className="page-hero-sub">Stand: April 2026</p>
          </div>
        </div>

        {/* Inhalt */}
        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            {/* Warnhinweis */}
            <div className="hinweis hinweis--warn" style={{ marginBottom: "32px" }}>
              <p>
                Diese AGB befinden sich noch in Überarbeitung und werden in Kürze durch eine
                anwaltlich geprüfte Fassung ersetzt.
              </p>
            </div>

            <div className="article-body legal-body">
              <strong>§ 1 Geltungsbereich</strong>
              <p>
                Diese Allgemeinen Geschäftsbedingungen gelten für alle Leistungen von
              </p>
              <p>
                Beran Cakmak (Einzelunternehmen)<br />
                Bärenwaldstraße 20<br />
                81737 München<br />
                (nachfolgend „Auftragnehmer“)
              </p>
              <p>gegenüber Verbrauchern und Unternehmern (nachfolgend „Auftraggeber“).</p>

              <strong>§ 2 Leistungsumfang</strong>
              <p>
                Der Auftragnehmer erbringt Koordinations- und Handwerksleistungen in München und
                Umgebung. Der genaue Leistungsumfang ergibt sich aus dem individuellen Angebot.
              </p>
              <p>
                Der Auftragnehmer ist berechtigt, zur Erfüllung seiner Leistungen qualifizierte
                Fachbetriebe und Subunternehmer einzusetzen. Die Verantwortung gegenüber dem
                Auftraggeber verbleibt beim Auftragnehmer.
              </p>

              <strong>§ 3 Angebot und Vertragsschluss</strong>
              <p>
                3.1 Preisangaben auf der Website und im Preisrechner sind unverbindliche
                Richtwerte. Ein Vertrag kommt erst durch die schriftliche Auftragsbestätigung des
                Auftragnehmers zustande.
              </p>
              <p>
                3.2 Das verbindliche Angebot wird nach dem Vor-Ort-Termin erstellt und ist 14 Tage
                gültig.
              </p>
              <p>
                3.3 Der Auftraggeber nimmt das Angebot durch schriftliche oder elektronische
                Bestätigung an.
              </p>

              <strong>§ 4 Preise und Zahlung</strong>
              <p>
                4.1 Es gelten die im Angebot ausgewiesenen Preise inkl. der gesetzlichen
                Mehrwertsteuer.
              </p>
              <p>
                4.2 Anfahrtskosten werden bei Beauftragung vollständig auf den Auftrag angerechnet.
              </p>
              <p>
                4.3 Die Rechnung ist nach Abnahme der Leistung innerhalb von 14 Tagen ohne Abzug
                fällig.
              </p>
              <p>
                4.4 Bei Zahlungsverzug werden Verzugszinsen in Höhe von 5 Prozentpunkten über dem
                Basiszinssatz berechnet.
              </p>

              <strong>§ 5 Mitwirkungspflichten</strong>
              <p>
                5.1 Der Auftraggeber stellt sicher, dass die Arbeitsstätte zugänglich und
                vorbereitet ist.
              </p>
              <p>
                5.2 Erforderliche Genehmigungen (z.B. für Baumfällungen oder Umbaumaßnahmen) sind
                vom Auftraggeber einzuholen, sofern nicht ausdrücklich anders vereinbart.
              </p>
              <p>
                5.3 Bei Mietobjekten ist der Auftraggeber für die Einholung der
                Vermieter-Zustimmung verantwortlich.
              </p>

              <strong>§ 6 Termine und Fristen</strong>
              <p>
                6.1 Terminangaben sind Wunschtermine und werden nach Verfügbarkeitsbestätigung
                verbindlich.
              </p>
              <p>
                6.2 Verschiebungen durch unvorhergesehene Ereignisse (z.B. Materialmangel,
                Krankheit) werden dem Auftraggeber unverzüglich mitgeteilt.
              </p>

              <strong>§ 7 Abnahme</strong>
              <p>
                7.1 Nach Fertigstellung wird die Leistung gemeinsam abgenommen. Das Ergebnis wird
                digital protokolliert.
              </p>
              <p>
                7.2 Erkennbare Mängel sind bei der Abnahme anzuzeigen. Nachträgliche Reklamationen
                offensichtlicher Mängel sind ausgeschlossen.
              </p>

              <strong>§ 8 Gewährleistung</strong>
              <p>8.1 Es gelten die gesetzlichen Gewährleistungsrechte.</p>
              <p>
                8.2 Bei Mängeln hat der Auftraggeber zunächst Anspruch auf Nachbesserung. Schlägt
                die Nachbesserung zweimal fehl, kann der Auftraggeber Minderung oder Rücktritt
                verlangen.
              </p>
              <p>8.3 Die Gewährleistungsfrist beträgt 2 Jahre ab Abnahme.</p>

              <strong>§ 9 Haftung</strong>
              <p>
                9.1 Der Auftragnehmer haftet für Schäden, die durch vorsätzliches oder grob
                fahrlässiges Verhalten entstehen.
              </p>
              <p>
                9.2 Bei leichter Fahrlässigkeit haftet der Auftragnehmer nur bei Verletzung
                wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren Schaden.
              </p>
              <p>
                9.3 Die Haftung für indirekte Schäden und entgangenen Gewinn ist ausgeschlossen,
                soweit gesetzlich zulässig.
              </p>

              <strong>§ 10 Datenschutz</strong>
              <p>
                Die Erhebung und Verarbeitung personenbezogener Daten erfolgt gemäß unserer{" "}
                <a href="/datenschutz">Datenschutzerklärung</a>.
              </p>

              <strong>§ 11 Streitbeilegung</strong>
              <p>
                Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ec.europa.eu/consumers/odr
                </a>
              </p>
              <p>
                Wir sind nicht bereit und nicht verpflichtet, an einem Streitbeilegungsverfahren
                vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>

              <strong>§ 12 Schlussbestimmungen</strong>
              <p>12.1 Es gilt deutsches Recht.</p>
              <p>12.2 Erfüllungsort und Gerichtsstand ist München.</p>
              <p>
                12.3 Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der
                übrigen Bestimmungen unberührt.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
