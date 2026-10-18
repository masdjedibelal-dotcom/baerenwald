import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { TeoRechtsSeite } from "@/components/teo/TeoRechtsSeite";
import { istTeo, MARKE } from "@/lib/marke";
import { ANBIETER } from "@/lib/recht-anbieter";

export const metadata: Metadata = {
  title: `Datenschutz — ${MARKE.nameLang}`,
  robots: "noindex",
};

function Inhalt() {
  return (
    <>
      <strong>1. Verantwortlicher</strong>
      <p>
        {ANBIETER.name}
        <br />
        {ANBIETER.strasse}
        <br />
        {ANBIETER.ortZeile}
        <br />
        E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
        {ANBIETER.telefon ? (
          <>
            <br />
            Telefon: <a href={ANBIETER.telefon.href}>{ANBIETER.telefon.anzeige}</a>
          </>
        ) : null}
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
        <strong>Über den Preisrechner und das Anfrageformular:</strong>
      </p>
      <ul>
        <li>Vor- und Nachname</li>
        <li>Telefonnummer</li>
        <li>E-Mail-Adresse (optional)</li>
        <li>PLZ und Standort</li>
        <li>Projektdetails</li>
        <li>Bei Geschäftskunden und Hausverwaltungen: Firmenname</li>
        <li>Optional hochgeladene Fotos zum Vorhaben</li>
      </ul>
      <p>
        <strong>Über {MARKE.kiName} (KI-Assistent in {MARKE.portalName}):</strong>
      </p>
      <ul>
        <li>Inhalte Ihrer Chat-Nachrichten (z. B. Vorhaben, PLZ, Fragen)</li>
        <li>Antworten des KI-Dienstes</li>
        <li>Eine technische Session-Kennung (Session-ID)</li>
        <li>
          IP-Adresse (kurzzeitig, zum Schutz vor Missbrauch — Rate-Limit, max. 30
          Anfragen pro Stunde)
        </li>
      </ul>
      <p>
        Rechtsgrundlage Preisrechner/Anfrageformular: Art. 6 Abs. 1 lit. b DSGVO
        (Vertragsanbahnung). Rechtsgrundlage {MARKE.kiName}: Art. 6 Abs. 1 lit. b DSGVO
        (Vertragsanbahnung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
        einer funktionsfähigen, missbrauchssicheren Beratung).
      </p>

      <strong id="meinbaerenwald">3. {MARKE.portalName} (Kundenportal)</strong>
      <p>
        Unter{" "}
        <a href="/portal/login">{MARKE.portalName}</a> können Sie sich mit E-Mail und Passwort
        registrieren bzw. anmelden, um Ihre Anfragen, Angebote, Aufträge und freigegebene
        Dokumente einzusehen (kein öffentlicher Link mehr mit Einmal-Token).
      </p>
      <p>
        <strong>Bei Registrierung und Login:</strong>
      </p>
      <ul>
        <li>E-Mail-Adresse</li>
        <li>Passwort (gespeichert verschlüsselt beim Anbieter Supabase Auth — wir sehen es nicht im Klartext)</li>
        <li>Name und optional Telefonnummer (bei der Registrierung)</li>
        <li>Technische Session-Daten (Cookies bzw. vergleichbare Speicher im Browser für die Anmeldung)</li>
      </ul>
      <p>
        <strong>Im Portal sichtbar:</strong> Daten zu Ihren bei uns geführten Anfragen,
        Angeboten und Aufträgen (z. B. Status, Termine, freigegebene PDFs und Fotos), soweit
        sie Ihnen zur Verfügung gestellt wurden.
      </p>
      <p>
        <strong>Verknüpfung mit Ihrem Kundenstamm:</strong> Wenn Sie dieselbe E-Mail wie in
        unserer Kundenverwaltung nutzen, wird Ihr Konto mit dem bestehenden Kundenprofil
        verknüpft (<em>auth_user_id</em> in unserer Datenbank).
      </p>
      <p>
        <strong>E-Mail-Bestätigung:</strong> Nach der Registrierung sendet Supabase eine
        Bestätigungs-E-Mail mit Link. Ohne Bestätigung ist kein Login möglich.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Durchführung bzw. Anbahnung des
        Vertrags, Bereitstellung des Kundenportals) und Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse an sicherer, nachvollziehbarer Kundenkommunikation).
      </p>

      <strong id="partner-portal">3a. {MARKE.name} Partner (Partnerportal)</strong>
      <p>
        Unter{" "}
        <a href="/partner/login">{MARKE.name} Partner</a> können Handwerksbetriebe
        mit Partnerschaft Anfragen beantworten, Angebote (Preis und PDF) einreichen
        und Bautagebuch-Einträge zu zugewiesenen Aufträgen pflegen.
      </p>
      <p>
        <strong>Registrierung:</strong> {MARKE.name} legt Partnerbetriebe vorab im
        System an und hinterlegt die Kontakt-E-Mail. Danach können sich Betriebe
        unter <a href="/partner/registrieren">Registrieren</a> selbst ein Konto
        anlegen — ohne separate Freischaltung.
      </p>
      <p>
        <strong>Bei Login:</strong> E-Mail, Passwort (Supabase Auth), Session-Cookies.
      </p>
      <p>
        <strong>Im Portal verarbeitet:</strong> Zuweisungen zu Angeboten/Gewerken (PLZ,
        Ort, Leistungspositionen ohne Kundennamen), eingereichte Preise und PDF-Angebote,
        Bautagebuch-Texte, Fotos und Dokumente (PDF) zu Aufträgen (Speicherung im privaten Storage-Bucket{" "}
        <em>handwerker-uploads</em>).
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag mit Partnerbetrieb bzw.
        Auftragsabwicklung) und Art. 6 Abs. 1 lit. f DSGVO (effiziente Projektkoordination).
      </p>

      <strong id="melden-hv">3b. Schadenmeldung über Hausverwaltung (/melden)</strong>
      <p>
        Über einen Melde-Link einer Hausverwaltung (z. B.{" "}
        <em>/melden/{"{org}"}/{"{objekt}"}</em>) können Mieterinnen und Mieter
        Schadenmeldungen ohne Konto einreichen.
      </p>
      <p>
        <strong>Verarbeitete Daten:</strong> Name, Kontaktdaten, Einheit, Kategorie,
        Beschreibung, hochgeladene Fotos, Objektbezug sowie technische Schutzdaten
        (z. B. IP-Adresse zur Missbrauchsabwehr/Rate-Limit).
      </p>
      <p>
        <strong>Zwecke:</strong> Erfassung der Meldung, Abstimmung mit der zuständigen
        Hausverwaltung, Koordination der Bearbeitung und ggf. Weitergabe an beauftragte
        Handwerksbetriebe zur Auftragsdurchführung.
      </p>
      <p>
        <strong>Rollenmodell:</strong> Die zuständige Hausverwaltung ist gegenüber den
        betroffenen Personen in der Regel verantwortlich. {MARKE.name} verarbeitet Daten
        je nach Vertragskonstellation als technischer Dienstleister (Auftragsverarbeitung)
        oder im abgestimmten Verantwortungsrahmen.
      </p>
      <p>
        <strong>Rechtsgrundlagen:</strong> Art. 6 Abs. 1 lit. b DSGVO und/oder Art. 6
        Abs. 1 lit. f DSGVO.
      </p>
      <p>
        <strong>Empfänger:</strong> zuständige Hausverwaltung, {MARKE.name}-interne
        zuständige Stellen, ggf. beauftragte Handwerksbetriebe.
      </p>
      <p>
        <strong>Speicherdauer:</strong> bis Abschluss des Vorgangs und darüber hinaus
        nur im Rahmen gesetzlicher Aufbewahrungsfristen oder zur Geltendmachung,
        Ausübung oder Verteidigung von Rechtsansprüchen.
      </p>

      <strong id="auftraggeber-portal">3c. Auftraggeber-Portal (Organisationen)</strong>
      <p>
        Im Auftraggeber-Portal verwalten Hausverwaltungen und gewerbliche Auftraggeber
        Meldungen, Projekte, Objekte und Freigaben. Dabei werden Organisations-,
        Objekt- und Vorgangsdaten verarbeitet, soweit dies für die Bearbeitung,
        Steuerung und Dokumentation erforderlich ist.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag/Leistungserbringung) und
        Art. 6 Abs. 1 lit. f DSGVO (ordnungsgemäße Betriebs- und Prozessorganisation).
      </p>

      <strong>4. Weitergabe von Daten</strong>
      <p>
        Ihre Daten werden nicht verkauft. Eine Weitergabe an Dritte erfolgt nur, soweit
        dies für den Betrieb der Website und Ihre Anfrage erforderlich ist:
      </p>
      <ul>
        <li>An beteiligte Handwerksbetriebe zur Auftragsdurchführung</li>
        <li>
          An Auftragsverarbeiter (Hosting, Datenbank, E-Mail, Analyse, KI- und
          Zusatzdienste) — siehe die Abschnitte 5 bis 14
        </li>
        <li>Bei gesetzlicher Verpflichtung</li>
      </ul>

      <strong>5. Hosting</strong>
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

      <strong>6. Datenbank &amp; Backend</strong>
      <p>
        Supabase Inc.
        <br />
        970 Toa Payoh North,
        <br />
        #07-04, Singapur 318992
      </p>
      <p>
        Supabase verarbeitet Daten auf Servern in der EU (Frankfurt, AWS eu-central-1).
        Darüber speichern wir u. a. Anfragen aus Rechner und Anfrageformular, Verläufe des
        {MARKE.kiName}-Chats in {MARKE.portalName} sowie — für
        {MARKE.portalName} — Authentifizierungsdaten (Supabase Auth) und die Verknüpfung zum
        Kundenstamm.
        <br />
        Datenschutzerklärung Supabase:{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          https://supabase.com/privacy
        </a>
      </p>

      <strong>7. E-Mail-Versand</strong>
      <p>
        Resend Inc.
        <br />
        San Francisco, USA
      </p>
      <p>
        <strong>Resend</strong> wird für Bestätigungsmails nach Anfragen über den Rechner
        genutzt. Resend ist zertifiziert gemäß EU-US Data Privacy Framework.
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
      <p>
        <strong>Supabase Auth</strong> versendet System-E-Mails für {MARKE.portalName} (z. B.
        Registrierung bestätigen, Passwort zurücksetzen). Anbieter ebenfalls Supabase
        (siehe Abschnitt 6).
      </p>

      <strong id="ki-beratung">8. {MARKE.kiName} (KI-Assistent in {MARKE.portalName})</strong>
      <p>
        Nach der Anmeldung in {MARKE.portalName} können Sie den Chat-Dienst{" "}
        <strong>{MARKE.kiName}</strong> nutzen. Er dient der unverbindlichen Orientierung zu
        Handwerks- und Renovierungsthemen in München und Umgebung (z. B. Gewerke, Ablauf,
        Vorbereitung eines Preisrahmens). Es handelt sich nicht um verbindliche
        Beratung, kein Angebot und keine Rechts-, Steuer- oder Medizinberatung.
      </p>
      <p>
        <strong>Ablauf der Verarbeitung:</strong> Ihre Nachrichten werden über unsere
        Server an den KI-Dienst <strong>OpenAI</strong> übermittelt, damit eine Antwort erzeugt
        werden kann. Der Chat-Verlauf und eine Zusammenfassung Ihres Vorhabens werden zu Ihrem
        Kundenkonto in unserer Datenbank (Supabase, EU) gespeichert.
      </p>
      <p>
        <strong>Anbieter KI-Dienst:</strong>
        <br />
        OpenAI Ireland Ltd., 1st Floor, The Liffey Trust Centre, 117–126 Sheriff Street Upper,
        Dublin 1, D01 YC43, Irland (für Nutzer im EWR)
      </p>
      <p>
        Die Übermittlung kann in die USA erfolgen. OpenAI stellt hierfür geeignete Garantien
        bereit (z. B. Standardvertragsklauseln der EU-Kommission). Wir haben mit OpenAI bzw.
        über die Nutzung der API die jeweils geltenden Vertrags- und Datenschutzbedingungen
        als Auftragsverarbeitung berücksichtigt. Über die API übermittelte Inhalte werden nach
        Angaben von OpenAI nicht zum Training der Modelle verwendet.
        <br />
        Datenschutz OpenAI:{" "}
        <a
          href="https://openai.com/policies/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://openai.com/policies/privacy-policy
        </a>

      </p>
      <p>
        <strong>Freiwilligkeit und Hinweise zur Eingabe:</strong> Die Nutzung ist
        freiwillig. Bitte geben Sie keine besonderen Kategorien personenbezogener Daten an (z.
        B. Gesundheitsdaten, vollständige Adressen, Ausweisdaten, Daten Dritter). Nennen Sie
        nur Informationen, die für Ihr Handwerksvorhaben nötig sind.
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

      <strong id="cookies-tracking">9. Cookies, Einwilligung &amp; Tracking</strong>
      <p>
        Beim ersten Besuch kann ein Hinweis zu Cookies und Statistik erscheinen. Ihre
        Wahl speichern wir lokal im Browser (<em>bw_cookie_consent_v1</em>), damit der
        Hinweis nicht erneut erscheint.
      </p>
      <p>
        <strong>Technisch notwendig</strong> (ohne separate Einwilligung): z. B.
        Session-Speicher für Login in {MARKE.portalName} und im Partner-Portal, sowie
        sessionbezogene Daten für den Rechner-Ablauf.
      </p>
      <p>
        <strong>Statistik (PostHog)</strong> — nur nach Ihrer Einwilligung über
        „Akzeptieren“ im Cookie-Hinweis:
      </p>
      <p>
        PostHog Inc.
        <br />
        2261 Market Street, Suite 4008
        <br />
        San Francisco, CA 94114, USA
      </p>
      <p>
        Wir nutzen PostHog zur Analyse der Websitenutzung (z. B. welche Bereiche geklickt
        werden). PostHog verarbeitet Daten auf EU-Servern (Frankfurt). Es können pseudonyme
        Nutzungsdaten (z. B. Geräte-/Browserinformationen, Ereignisse) verarbeitet werden;
        dabei kann auch der lokale Speicher des Browsers genutzt werden.
        <br />
        Rechtsgrundlage bei Einwilligung: Art. 6 Abs. 1 lit. a DSGVO. Sie können die
        Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen (z. B. durch Löschen
        der Website-Daten im Browser).
        <br />
        Datenschutzerklärung PostHog:{" "}
        <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
          https://posthog.com/privacy
        </a>
      </p>

      <strong id="web-push">10. Web-Push-Benachrichtigungen (VAPID)</strong>
      <p>
        Im Kunden- und Partner-Portal sowie im CRM können optionale Browser-Push-Nachrichten
        (Web Push) angeboten werden. Dazu speichern wir eine Push-Subscription (Endpunkt
        und Schlüssel) und nutzen VAPID-Schlüssel zur Authentifizierung gegenüber dem
        Push-Dienst des Browserherstellers (z.&nbsp;B. Google FCM, Mozilla, Apple).
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Die Einwilligung kann
        jederzeit in den Browser- oder Portal-Einstellungen widerrufen werden.
      </p>

      <strong id="telegram">11. Telegram-Bot</strong>
      <p>
        Für interne Betriebsbenachrichtigungen (z.&nbsp;B. neue Meldungen) kann ein
        Telegram-Bot eingesetzt werden. Dabei werden Vorgangs-Metadaten und ggf.
        Kontaktkurzinfos an die Telegram-Server (Telegram Messenger Inc. / Telegram FZ-LLC)
        übermittelt, soweit Mitarbeitende den Bot verknüpft haben.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an schneller
        betrieblicher Information). Telegram-Nutzung ist für Endkunden nicht erforderlich.
      </p>

      <strong id="maps-distance">12. Entfernungsberechnung (Google Maps Distance Matrix)</strong>
      <p>
        Zur Plausibilisierung von Anfahrten und Entfernungen können wir die Google Maps
        Distance Matrix API (Google Ireland Limited / Google LLC) nutzen. Dabei werden
        Adress- oder Koordinatenangaben an Google übermittelt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an effizienter
        Einsatzplanung) bzw. Art. 6 Abs. 1 lit. b DSGVO bei vertraglicher Notwendigkeit.
        <br />
        Datenschutzerklärung Google:{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://policies.google.com/privacy
        </a>
      </p>

      <strong id="openweather">13. Wetterdaten (OpenWeatherMap)</strong>
      <p>
        Für wetterabhängige Hinweise (z.&nbsp;B. Außentermine) können wir OpenWeatherMap
        (OpenWeather Ltd.) mit Standortbezug (z.&nbsp;B. PLZ/Koordinaten) abfragen. Es
        werden keine personenbezogenen Kontaktdaten an OpenWeatherMap übermittelt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        <br />
        Datenschutzerklärung OpenWeather:{' '}
        <a
          href="https://openweather.co.uk/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://openweather.co.uk/privacy-policy
        </a>
      </p>

      <strong id="search-console">14. Google Search Console</strong>
      <p>
        Zur Überwachung der Sichtbarkeit unserer Website in der Google-Suche nutzen wir
        Google Search Console. Dabei können aggregierte Such- und Indexierungsdaten
        verarbeitet werden; es findet keine Nutzer-Tracking-Einbindung auf der Website
        allein durch Search Console statt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
        Suchmaschinenoptimierung und technischer Überwachung).
      </p>

      <strong>16. Speicherdauer</strong>
      <p>
        Daten werden gelöscht, sobald der Zweck entfällt, sofern keine gesetzlichen
        Aufbewahrungspflichten entgegenstehen.
      </p>
      <ul>
        <li>
          <strong>{MARKE.kiName}-Chat-Protokolle:</strong> in der Regel 90 Tage nach der
          letzten Nachricht in der jeweiligen Session, spätestens nach 12 Monaten
        </li>
        <li>
          <strong>Anfragen aus Rechner und Anfrageformular:</strong> bis zur Erledigung der
          Anfrage, danach gemäß gesetzlichen Fristen
        </li>
        <li>
          <strong>Mieter-Schadenmeldungen (/melden):</strong> bis Abschluss des
          Vorgangs, danach gemäß gesetzlichen Fristen oder Löschkonzept im CRM
        </li>
        <li>
          <strong>Fotos in Melder-Meldungen:</strong> bis Abschluss des Vorgangs,
          danach Löschung sofern keine Aufbewahrungspflicht besteht
        </li>
        <li>
          <strong>Beauftragte Projekte:</strong> gesetzliche Aufbewahrungsfristen (i. d.
          R. 10 Jahre)
        </li>
        <li>
          <strong>{MARKE.portalName}-Konto:</strong> bis zur Löschung Ihres Kontos bzw. auf
          Anfrage; die Verknüpfung zum Kundenstamm entfällt dann. Gesetzliche
          Aufbewahrung von Rechnungs- und Vertragsdaten bleibt unberührt.
        </li>
      </ul>

      <strong>17. Ihre Rechte</strong>
      <p>Sie haben das Recht auf:</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
      </ul>
      <p>
        Anfragen an:{" "}
        <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
        <br />
        Bitte geben Sie bei Auskunft oder Löschung zum {MARKE.kiName}-Chat möglichst Datum und
        Inhalt Ihrer Nachricht an, damit wir den Eintrag zuordnen können. Für {MARKE.portalName}
        nennen Sie bitte die E-Mail-Adresse Ihres Kontos.
      </p>

      <strong>18. Beschwerderecht</strong>
      <p>Sie haben das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren:</p>
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

      <strong>19. Änderungen</strong>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung bei rechtlichen oder technischen
        Änderungen anzupassen.
      </p>
    </>
  );
}

export default function DatenschutzPage() {
  if (istTeo) {
    return (
      <TeoRechtsSeite titel="Datenschutzerklärung" stand="Stand: 2. Juni 2026">
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
              <span className="breadcrumb-current">Datenschutz</span>
            </nav>
            <h1 className="page-hero-h1">Datenschutzerklärung</h1>
            <p className="page-hero-sub">Stand: 2. Juni 2026</p>
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
