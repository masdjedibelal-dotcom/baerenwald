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
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>
                ›
              </span>
              <span className="breadcrumb-current">Datenschutz</span>
            </nav>
            <h1 className="page-hero-h1">Datenschutzerklärung</h1>
            <p className="page-hero-sub">Stand: 31. Mai 2026</p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <strong>1. Verantwortlicher</strong>
              <p>
                Beran Cakmak
                <br />
                Bärenwaldstraße 20
                <br />
                81737 München
                <br />
                E-Mail: <a href="mailto:info@baerenwald-muenchen.de">info@baerenwald-muenchen.de</a>
                <br />
                Telefon: <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
              </p>

              <strong>2. Erhobene Daten</strong>
              <p>Beim Besuch unserer Website werden folgende Daten erhoben:</p>
              <p>
                <strong>Automatisch:</strong>
                <br />
                Browser, Betriebssystem, IP-Adresse, Zugriffszeit (z. B. zur Sicherheit und
                Stabilität der Website)
              </p>
              <p>
                <strong>Über den Preisrechner und Kontaktformular:</strong>
              </p>
              <ul>
                <li>Vor- und Nachname</li>
                <li>Telefonnummer</li>
                <li>E-Mail-Adresse (optional)</li>
                <li>PLZ und Standort</li>
                <li>Projektdetails</li>
              </ul>
              <p>
                <strong>Über BärenwaldGPT (KI-Beratung im Rechner):</strong>
              </p>
              <ul>
                <li>Inhalte deiner Chat-Nachrichten (z. B. Vorhaben, PLZ, Fragen)</li>
                <li>Antworten des KI-Dienstes</li>
                <li>Eine technische Session-Kennung (Session-ID)</li>
                <li>
                  IP-Adresse (kurzzeitig, zum Schutz vor Missbrauch — Rate-Limit, max. 30
                  Anfragen pro Stunde)
                </li>
              </ul>
              <p>
                Rechtsgrundlage Preisrechner/Kontakt: Art. 6 Abs. 1 lit. b DSGVO
                (Vertragsanbahnung). Rechtsgrundlage BärenwaldGPT: Art. 6 Abs. 1 lit. b DSGVO
                (Vertragsanbahnung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
                einer funktionsfähigen, missbrauchssicheren Beratung).
              </p>

              <strong>3. Weitergabe von Daten</strong>
              <p>
                Deine Daten werden nicht verkauft. Eine Weitergabe an Dritte erfolgt nur, soweit
                dies für den Betrieb der Website und deine Anfrage erforderlich ist:
              </p>
              <ul>
                <li>An beteiligte Handwerksbetriebe zur Auftragsdurchführung</li>
                <li>
                  An Auftragsverarbeiter (Hosting, Datenbank, E-Mail, Analyse, KI-Dienst) —
                  siehe die Abschnitte 4 bis 8
                </li>
                <li>Bei gesetzlicher Verpflichtung</li>
              </ul>

              <strong>4. Hosting</strong>
              <p>
                Netlify Inc.
                <br />
                44 Montgomery Street,
                <br />
                Suite 300
                <br />
                San Francisco, CA 94104, USA
              </p>
              <p>
                Netlify ist zertifiziert gemäß EU-US Data Privacy Framework.
                <br />
                Datenschutzerklärung Netlify:{" "}
                <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer">
                  https://www.netlify.com/privacy/
                </a>
              </p>

              <strong>5. Datenbank &amp; Backend</strong>
              <p>
                Supabase Inc.
                <br />
                970 Toa Payoh North,
                <br />
                #07-04, Singapur 318992
              </p>
              <p>
                Supabase verarbeitet Daten auf Servern in der EU (Frankfurt, AWS eu-central-1).
                Darüber speichern wir u. a. Leads aus dem Rechner und Protokolle der
                BärenwaldGPT-Chat-Nutzung (Tabelle <em>ki_anfragen_log</em>: Anfrage, Antwort,
                Session, Zeitstempel).
                <br />
                Datenschutzerklärung Supabase:{" "}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                  https://supabase.com/privacy
                </a>
              </p>

              <strong>6. E-Mail Versand</strong>
              <p>
                Resend Inc.
                <br />
                San Francisco, USA
              </p>
              <p>
                Resend wird für den Versand automatischer Bestätigungsmails genutzt. Resend ist
                zertifiziert gemäß EU-US Data Privacy Framework.
                <br />
                Datenschutzerklärung Resend:{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://resend.com/legal/privacy-policy
                </a>
              </p>

              <strong id="ki-beratung">7. BärenwaldGPT (KI-Beratung im Rechner)</strong>
              <p>
                Auf unserer Website kannst du im Rechner den Chat-Dienst{" "}
                <strong>BärenwaldGPT</strong> nutzen. Er dient der unverbindlichen Orientierung zu
                Handwerks- und Renovierungsthemen in München und Umgebung (z. B. Gewerke, Ablauf,
                Vorbereitung eines Preisrahmens). Es handelt sich nicht um verbindliche
                Beratung, kein Angebot und keine Rechts-, Steuer- oder Medizinberatung.
              </p>
              <p>
                <strong>Ablauf der Verarbeitung:</strong> Deine Nachrichten werden über unsere
                Server an den KI-Dienst <strong>Anthropic, PBC</strong> (Modell Claude) übermittelt,
                damit eine Antwort erzeugt werden kann. Antworten und Anfragen können in unserer
                Datenbank (Supabase, EU) protokolliert werden.
              </p>
              <p>
                <strong>Anbieter KI-Dienst:</strong>
                <br />
                Anthropic, PBC
                <br />
                San Francisco, USA
              </p>
              <p>
                Die Übermittlung kann in die USA erfolgen. Anthropic stellt hierfür geeignete
                Garantien bereit (z. B. Standardvertragsklauseln der EU-Kommission). Wir haben mit
                Anthropic bzw. über die Nutzung der API die jeweils geltenden Vertrags- und
                Datenschutzbedingungen als Auftragsverarbeitung berücksichtigt.
                <br />
                Datenschutz Anthropic:{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.anthropic.com/legal/privacy
                </a>
              </p>
              <p>
                <strong>Freiwilligkeit und Hinweise zur Eingabe:</strong> Die Nutzung ist
                freiwillig. Bitte gib keine besonderen Kategorien personenbezogener Daten an (z.
                B. Gesundheitsdaten, vollständige Adressen, Ausweisdaten, Daten Dritter). Nenne
                nur Informationen, die für dein Handwerksvorhaben nötig sind.
              </p>
              <p>
                <strong>Automatisierte Entscheidungen:</strong> Es findet keine automatisierte
                Entscheidung im Sinne von Art. 22 DSGVO statt. Ein angezeigter Preisrahmen basiert
                auf unserem Rechner, nicht allein auf der KI-Antwort.
              </p>
              <p>
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Anbahnung eines Vertrags) und Art. 6
                Abs. 1 lit. f DSGVO (berechtigtes Interesse an Betrieb, Sicherheit und
                Weiterentwicklung des Dienstes).
              </p>

              <strong>8. Analyse &amp; Tracking</strong>
              <p>
                PostHog Inc.
                <br />
                2261 Market Street #4008
                <br />
                San Francisco, CA 94114, USA
              </p>
              <p>
                Wir nutzen PostHog zur Analyse der Websitenutzung (z. B. welche Bereiche geklickt
                werden). PostHog verarbeitet Daten auf EU-Servern (Frankfurt). PostHog setzt keine
                Cookies für dieses Tracking. Es können pseudonyme Nutzungsdaten (z. B.
                Geräte-/Browserinformationen, Ereignisse) verarbeitet werden.
                <br />
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
                Reichweitenmessung).
                <br />
                Datenschutzerklärung PostHog:{" "}
                <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
                  https://posthog.com/privacy
                </a>
              </p>

              <strong>9. Speicherdauer</strong>
              <p>
                Daten werden gelöscht, sobald der Zweck entfällt, sofern keine gesetzlichen
                Aufbewahrungspflichten entgegenstehen.
              </p>
              <ul>
                <li>
                  <strong>BärenwaldGPT-Chat-Protokolle:</strong> in der Regel 90 Tage nach der
                  letzten Nachricht in der jeweiligen Session, spätestens nach 12 Monaten
                </li>
                <li>
                  <strong>Leads und Anfragen aus dem Rechner:</strong> bis zur Erledigung der
                  Anfrage, danach gemäß gesetzlichen Fristen
                </li>
                <li>
                  <strong>Beauftragte Projekte:</strong> gesetzliche Aufbewahrungsfristen (i. d.
                  R. 10 Jahre)
                </li>
              </ul>

              <strong>10. Deine Rechte</strong>
              <p>Du hast das Recht auf:</p>
              <ul>
                <li>Auskunft (Art. 15 DSGVO)</li>
                <li>Berichtigung (Art. 16 DSGVO)</li>
                <li>Löschung (Art. 17 DSGVO)</li>
                <li>Widerspruch (Art. 21 DSGVO)</li>
                <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              </ul>
              <p>
                Anfragen an:{" "}
                <a href="mailto:info@baerenwald-muenchen.de">info@baerenwald-muenchen.de</a>
                <br />
                Bitte gib bei Auskunft oder Löschung zum BärenwaldGPT-Chat möglichst Datum und
                Inhalt deiner Nachricht an, damit wir den Eintrag zuordnen können.
              </p>

              <strong>11. Beschwerderecht</strong>
              <p>Du hast das Recht, dich bei der zuständigen Aufsichtsbehörde zu beschweren:</p>
              <p>
                Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
                <br />
                Promenade 18
                <br />
                91522 Ansbach
                <br />
                <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
                  www.lda.bayern.de
                </a>
              </p>

              <strong>12. Änderungen</strong>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung bei rechtlichen oder technischen
                Änderungen anzupassen.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
