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
            <p className="page-hero-sub">Stand: Mai 2026</p>
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
                Browser, Betriebssystem, IP-Adresse, Zugriffszeit (nur zur Verbesserung des
                Angebots, keine Weitergabe)
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
              <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung)</p>

              <strong>3. Weitergabe von Daten</strong>
              <p>Deine Daten werden nicht an Dritte verkauft. Eine Weitergabe erfolgt nur:</p>
              <ul>
                <li>An beteiligte Handwerksbetriebe zur Auftragsdurchführung</li>
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

              <strong>7. Analyse &amp; Tracking</strong>
              <p>
                PostHog Inc.
                <br />
                2261 Market Street #4008
                <br />
                San Francisco, CA 94114, USA
              </p>
              <p>
                Wir nutzen PostHog zur Analyse der Websitenutzung. PostHog verarbeitet Daten auf
                EU-Servern (Frankfurt). Es werden keine personenbezogenen Daten gespeichert. PostHog
                setzt keine Cookies.
                <br />
                Datenschutzerklärung PostHog:{" "}
                <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
                  https://posthog.com/privacy
                </a>
              </p>

              <strong>8. Speicherdauer</strong>
              <p>
                Daten werden gelöscht sobald der Zweck entfällt. Bei beauftragten Projekten gelten
                gesetzliche Aufbewahrungsfristen (i. d. R. 10 Jahre).
              </p>

              <strong>9. Deine Rechte</strong>
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
              </p>

              <strong>10. Beschwerderecht</strong>
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

              <strong>11. Änderungen</strong>
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
