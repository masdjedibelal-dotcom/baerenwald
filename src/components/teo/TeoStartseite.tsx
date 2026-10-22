import Link from "next/link";
import { Building2, CalendarCheck, FileSignature, Siren } from "lucide-react";

import { TEO_LINK_ANFRAGE, TEO_LINK_RECHNER, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoRollen } from "@/components/teo/TeoRollen";
import {
  AblaufKarte,
  BentoAushang,
  BentoBudget,
  BentoExport,
  BentoFristen,
  BentoGrenze,
  BentoMelden,
  BentoMitteilung,
  HeroVisual,
} from "@/components/teo/TeoVisuals";
import { MARKE } from "@/lib/marke";

import "@/app/teo-start.css";

const ABLAUF = [
  { titel: "Gemeldet", text: "Mieter scannen den QR-Code im Treppenhaus, Ihr Hausmeister meldet per App. Mit Fotos, ohne Anruf." },
  { titel: "Geprüft", text: "teo schaut sich den Schaden an und schickt den passenden Betrieb." },
  { titel: "Freigegeben", text: "Unter Ihrer Wertgrenze geht es direkt los. Darüber kommt ein Angebot, Sie entscheiden." },
  { titel: "Erledigt", text: "Abnahme, Fotos, Rechnung. Alles hängt am Vorgang, auch noch nach Jahren." },
] as const;

const LEISTUNGEN = [
  { icon: Siren, titel: "Notfälle", text: "Rohrbruch am Freitagabend. Unsere Partnerbetriebe kommen auch kurzfristig." },
  { icon: Building2, titel: "Reparatur und Instandhaltung", text: "Vom tropfenden Hahn bis zur Fassade. Auch wenn mehrere Gewerke nötig sind." },
  { icon: CalendarCheck, titel: "Laufender Betrieb", text: "Treppenhaus, Garten, Winterdienst, Wartungen. Regelmäßig erledigt und abgehakt." },
  { icon: FileSignature, titel: "Angebote für die Versammlung", text: "Vergleichbar aufbereitet, fertig für die Beschlussvorlage." },
] as const;

export const TEO_FAQ = [
  {
    frage: "Was kostet teo?",
    antwort:
      "So viel wie eine direkte Beauftragung. Auf die Handwerkerleistung kommt kein Aufschlag. Wir rechnen über Volumen und feste Abläufe mit unseren Partnern.",
  },
  {
    frage: "Ist teo eine Software?",
    antwort:
      "Nein, ein Dienstleister. Die Software bekommen Sie dazu: Darin sehen Sie, Ihr Team, Mieter und Eigentümer jeden Vorgang. Die Arbeit macht teo.",
  },
  {
    frage: "Was wird aus unserem Hausmeister?",
    antwort: "Er bleibt. Mit der App hakt er Rundgänge und Putzpläne ab und meldet, was ihm auffällt. Den Rest organisiert teo.",
  },
  {
    frage: "Wer haftet, wenn etwas schiefgeht?",
    antwort:
      "teo. Sobald Sie einen Vorgang übergeben, sind wir für die fachgerechte Ausführung verantwortlich, inklusive Gewährleistung.",
  },
  {
    frage: "Behalten wir die Kontrolle?",
    antwort:
      "Ja. Sie legen pro Haus fest, bis zu welchem Betrag teo direkt beauftragen darf. Alles darüber geben Sie frei. Jeder Schritt steht im Protokoll.",
  },
  {
    frage: "Liefert teo auch Angebote für die Eigentümerversammlung?",
    antwort: "Ja. Vergleichbar aufbereitet und fertig für die Beschlussvorlage. Den Beschluss hängen Sie bei der Freigabe einfach an.",
  },
  {
    frage: "Wie starten wir, und wo ist teo tätig?",
    antwort:
      "Schicken Sie uns einen aktuellen Fall oder eine Anfrage. Danach richten wir Ihre Häuser ein, das dauert einen Termin. teo arbeitet in München und Umgebung.",
  },
] as const;

/** Hauptaktionen. `gold`: auf der goldenen Abschlussfläche (dunkle Knöpfe). */
function Aktionen({ gold = false }: { gold?: boolean }) {
  return (
    <div className="teo-aktionen">
      <Link href={TEO_LINK_ANFRAGE} className={gold ? "teo-btn" : "teo-btn ts-btn-gold"}>
        Anfrage stellen
      </Link>
      <Link href={TEO_LINK_RECHNER} className={gold ? "teo-btn teo-btn--rand" : "teo-btn teo-btn--rand-hell"}>
        Preis berechnen
      </Link>
    </div>
  );
}

export function TeoStartseite() {
  return (
    <TeoRahmen>
      <section className="ts-hero">
        <div className="teo-innen ts-hero__raster">
          <div className="ts-hero__text">
            <p className="ts-eyebrow">Für Haus- und WEG-Verwaltungen in München</p>
            <h1>
              Sie melden.
              <br />
              <span className="ts-akzent">teo regelt.</span>
            </h1>
            <p className="ts-lead">
              Rohrbruch, Klingel, Prüffrist: teo nimmt den Fall auf, schickt den Handwerker und meldet sich, wenn es
              erledigt ist. Sie sehen jeden Schritt und entscheiden, wo es Geld kostet.
            </p>
            <Aktionen />
            <p className="ts-hinweis">Antwort innerhalb eines Werktags · kostenlos und unverbindlich</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--blau" id="ablauf">
        <div className="teo-innen">
          <p className="ts-eyebrow ts-eyebrow--dunkel">So läuft es</p>
          <h2>Vom Wasserfleck bis zur Rechnung.</h2>
          <ol className="ts-ablauf">
            {ABLAUF.map((s, i) => (
              <li key={s.titel}>
                <AblaufKarte schritt={(i + 1) as 1 | 2 | 3 | 4} />
                <div className="ts-ablauf__text">
                  <span className="ts-ablauf__nr">{i + 1}</span>
                  <h3>{s.titel}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ts-abschnitt" id="rollen">
        <div className="teo-innen">
          <p className="ts-eyebrow ts-eyebrow--dunkel">Für alle im Haus</p>
          <h2>Jeder sieht, was er braucht.</h2>
          <TeoRollen />
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--dunkel" id="funktionen">
        <div className="teo-innen">
          <p className="ts-eyebrow">Funktionen</p>
          <h2>Was sonst gern liegen bleibt.</h2>
          <div className="ts-bento">
            <article className="ts-bento__kachel ts-bento__kachel--breit">
              <div>
                <h3>Prüffristen und Wartungen</h3>
                <p>Rauchmelder, Aufzug, Trinkwasser. teo beauftragt drei Wochen vor Fälligkeit, den Nachweis legen wir ab.</p>
              </div>
              <BentoFristen />
            </article>
            <article className="ts-bento__kachel ts-bento__kachel--hoch">
              <div>
                <h3>QR-Code im Treppenhaus</h3>
                <p>Ein Aushang pro Haus. Meldungen kommen mit Foto und Wohnung an.</p>
              </div>
              <BentoAushang />
              <BentoMelden />
            </article>
            <article className="ts-bento__kachel">
              <div>
                <h3>Ihre Wertgrenze</h3>
                <p>Darunter läuft es direkt. Darüber entscheiden Sie.</p>
              </div>
              <BentoGrenze />
            </article>
            <article className="ts-bento__kachel">
              <div>
                <h3>Budget je Haus</h3>
                <p>Ein Betrag pro Jahr, daneben der aktuelle Stand.</p>
              </div>
              <BentoBudget />
            </article>
            <article className="ts-bento__kachel">
              <div>
                <h3>Mitteilung ans Haus</h3>
                <p>Einmal schreiben. Hängt als Aushang und steht beim QR-Code.</p>
              </div>
              <BentoMitteilung />
            </article>
            <article className="ts-bento__kachel ts-bento__kachel--breit">
              <div>
                <h3>Kosten zum Export</h3>
                <p>Alle Ausgaben je Haus und Jahr als Datei, fertig für die Abrechnung.</p>
              </div>
              <BentoExport />
            </article>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="leistungen">
        <div className="teo-innen">
          <p className="ts-eyebrow ts-eyebrow--dunkel">Leistungen</p>
          <h2>Was teo für Sie erledigt.</h2>
          <div className="ts-leistungen">
            {LEISTUNGEN.map((l) => (
              <article key={l.titel}>
                <span className="ts-leistungen__icon">
                  <l.icon size={22} />
                </span>
                <h3>{l.titel}</h3>
                <p>{l.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-cta" id="kontakt">
        <div className="teo-innen ts-cta__innen">
          <div>
            <h2>Schicken Sie uns Ihren nächsten Schaden.</h2>
            <p>Wir zeigen Ihnen am echten Fall, wie es mit teo läuft. Oder rechnen Sie vorab einen Preis aus.</p>
          </div>
          <div>
            <Aktionen gold />
            <p className="ts-hinweis">
              Oder per E-Mail: <a href={`mailto:${MARKE.firma.email}`}>{MARKE.firma.email}</a>
            </p>
          </div>
        </div>
      </section>

      <section className="teo-abschnitt" id="faq">
        <div className="teo-innen teo-zweispaltig">
          <h2>Häufige Fragen.</h2>
          <div className="teo-faq">
            {TEO_FAQ.map((f, i) => (
              <details key={f.frage} open={i === 0}>
                <summary>{f.frage}</summary>
                <p>{f.antwort}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </TeoRahmen>
  );
}
