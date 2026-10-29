import Link from "next/link";
import {
  BellRing,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  DoorOpen,
  Droplets,
  FileSpreadsheet,
  Flame,
  Gauge,
  Hammer,
  Home,
  KeyRound,
  Megaphone,
  MessagesSquare,
  Minus,
  PaintRoller,
  PhoneMissed,
  QrCode,
  ShieldCheck,
  Snowflake,
  Users,
  Sparkles,
  Trees,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";

import { TeoFoto } from "@/components/teo/TeoFoto";
import { TEO_LINK_ANFRAGE, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoRollen } from "@/components/teo/TeoRollen";
import { Status } from "@/components/teo/TeoVisuals";
import { MARKE } from "@/lib/marke";

import "@/app/teo-start.css";

const ZIELGRUPPEN = [
  { icon: Briefcase, ton: "blau", titel: "Hausverwaltungen", text: "WEG- und Mietverwaltung" },
  { icon: Users, ton: "gold", titel: "Eigentümergemeinschaften", text: "auch selbst verwaltet" },
  { icon: Building2, ton: "rot", titel: "Bestandshalter", text: "Wohnungsunternehmen, Genossenschaften" },
] as const;

const PROBLEME = [
  { icon: PhoneMissed, titel: "Kein Handwerker ruft zurück." },
  { icon: CalendarClock, titel: "Die Fristen hängen an Ihnen." },
  { icon: MessagesSquare, titel: "Alle fragen nach dem Stand." },
] as const;

const ABLAUF = [
  { icon: QrCode, titel: "Gemeldet", text: "Per QR-Code oder App, mit Foto." },
  { icon: Wrench, titel: "Geprüft", text: "Wir schicken den passenden Betrieb." },
  { icon: Wallet, titel: "Freigegeben", text: "Bis zu Ihrer Grenze direkt." },
  { icon: ClipboardCheck, titel: "Erledigt", text: "Mit Fotos, Abnahme und Rechnung." },
] as const;

const FUNKTIONEN = [
  { icon: CalendarClock, titel: "Prüffristen", text: "Rauchmelder, Aufzug, Trinkwasser. Wir beauftragen rechtzeitig." },
  { icon: QrCode, titel: "QR-Code im Treppenhaus", text: "Mieter melden ohne Anruf, mit Foto und Wohnung." },
  { icon: Gauge, titel: "Ihre Wertgrenze", text: "Darunter läuft es direkt, darüber entscheiden Sie." },
  { icon: Wallet, titel: "Budget je Haus", text: "Ein Betrag pro Jahr, daneben der Stand." },
  { icon: Megaphone, titel: "Mitteilung ans Haus", text: "Einmal schreiben, als Aushang und online." },
  { icon: FileSpreadsheet, titel: "Kosten-Export", text: "Alle Ausgaben je Haus als Datei." },
] as const;

const GEWERKE = [
  { icon: Droplets, name: "Rohrbruch und Sanitär" },
  { icon: Flame, name: "Heizung" },
  { icon: Zap, name: "Elektrik" },
  { icon: KeyRound, name: "Schlüssel und Schließanlage" },
  { icon: DoorOpen, name: "Fenster und Türen" },
  { icon: Home, name: "Dach und Rinne" },
  { icon: PaintRoller, name: "Maler" },
  { icon: Hammer, name: "Sanierung" },
  { icon: ShieldCheck, name: "Wartung und Prüfungen" },
  { icon: Sparkles, name: "Treppenhausreinigung" },
  { icon: Trees, name: "Garten" },
  { icon: Snowflake, name: "Winterdienst" },
] as const;

/** Vergleich: ja / nein je Spalte (Software allein, Handwerker direkt, teo). */
const VERGLEICH: Array<[string, boolean, boolean, boolean]> = [
  ["Meldung mit Foto, ohne Anruf", true, false, true],
  ["Handwerker kommt, auch für Kleines", false, false, true],
  ["Termine und Nachfassen erledigt", false, false, true],
  ["Prüffristen laufen von selbst", false, false, true],
  ["Haftung und Gewährleistung", false, true, true],
  ["Alle sehen denselben Stand", true, false, true],
  ["Ein Ansprechpartner für alle Gewerke", false, false, true],
];

export const TEO_FAQ = [
  {
    frage: "Für wen ist teo?",
    antwort:
      "Für alle, die Mehrparteienhäuser verwalten: Hausverwaltungen, Eigentümergemeinschaften und Bestandshalter wie Wohnungsunternehmen, Genossenschaften oder Eigentümer mehrerer Häuser.",
  },
  {
    frage: "Was kostet teo?",
    antwort: "So viel wie eine direkte Beauftragung. Auf die Handwerkerleistung kommt kein Aufschlag. Die Software ist dabei.",
  },
  {
    frage: "Ist teo eine Software oder ein Handwerksbetrieb?",
    antwort: "Beides. Sie bekommen die Software für Ihr Team, und wir erledigen die Aufträge mit unseren Partnerbetrieben.",
  },
  {
    frage: "Was wird aus unserem Hausmeister?",
    antwort: "Er bleibt. Mit der App hakt er Rundgänge ab und meldet, was ihm auffällt. Den Rest organisieren wir.",
  },
  {
    frage: "Wer haftet, wenn etwas schiefgeht?",
    antwort: "Wir. Mit der Übergabe sind wir für die Ausführung verantwortlich, inklusive Gewährleistung.",
  },
  {
    frage: "Behalten wir die Kontrolle?",
    antwort: "Ja. Sie legen pro Haus fest, bis zu welchem Betrag wir direkt beauftragen. Alles darüber geben Sie frei.",
  },
  {
    frage: "Wo ist teo tätig?",
    antwort: "In München und Umgebung. Schicken Sie uns einen aktuellen Fall, dann richten wir Ihre Häuser ein.",
  },
] as const;

function Haken({ ja }: { ja: boolean }) {
  return ja ? (
    <span className="ts-vgl__ja" aria-label="ja">
      <Check size={16} strokeWidth={3} />
    </span>
  ) : (
    <span className="ts-vgl__nein" aria-label="nein">
      <Minus size={16} />
    </span>
  );
}

/** Eine echte Produktkarte über dem Foto (statt vieler Mini-Oberflächen). */
function VorgangKarte() {
  return (
    <div className="ts-overlay" aria-hidden="true">
      <span className="ts-overlay__icon">
        <Flame size={18} />
      </span>
      <span className="ts-overlay__text">
        <b>Heizung fällt aus</b>
        <small>Leopoldstr. 10 · Termin Do 9:00</small>
      </span>
      <Status ton="teo">Bei TEO</Status>
    </div>
  );
}

function AbnahmeKarte() {
  return (
    <div className="ts-overlay ts-overlay--klein" aria-hidden="true">
      <span className="ts-overlay__icon ts-overlay__icon--gruen">
        <ClipboardCheck size={18} />
      </span>
      <span className="ts-overlay__text">
        <b>Abnahme mit 3 Fotos</b>
        <small>Rechnung geprüft</small>
      </span>
    </div>
  );
}

function MeldungKarte() {
  return (
    <div className="ts-overlay ts-overlay--klein" aria-hidden="true">
      <span className="ts-overlay__icon">
        <BellRing size={18} />
      </span>
      <span className="ts-overlay__text">
        <b>3 neue Meldungen</b>
        <small>mit Fotos, sortiert nach Haus</small>
      </span>
    </div>
  );
}

export function TeoStartseite() {
  return (
    <TeoRahmen>
      <section className="ts-hero">
        <div className="ts-formen" aria-hidden="true">
          <span className="ts-formen__blau" />
          <span className="ts-formen__gold" />
          <span className="ts-formen__rot" />
        </div>
        <div className="teo-innen ts-hero__kopf">
          <h1>Sie verwalten. Wir machen die Technik.</h1>
          <div className="teo-aktionen ts-zentriert">
            <Link href={TEO_LINK_ANFRAGE} className="teo-btn">
              Anfrage stellen
            </Link>
          </div>
        </div>
        <div className="ts-breit">
          <div className="ts-buehne ts-buehne--hero">
            <TeoFoto name="hero" alt="Handwerker mit Werkzeugkoffer im Treppenhaus eines Altbaus" />
            <VorgangKarte />
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--eng" id="fuer-wen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Für alle, die Häuser verwalten.</h2>
          <ul className="ts-zielgruppen">
            {ZIELGRUPPEN.map((z) => (
              <li key={z.titel}>
                <span className={`ts-zielgruppen__icon ts-zielgruppen__icon--${z.ton}`}>
                  <z.icon size={24} strokeWidth={1.6} />
                </span>
                <b>{z.titel}</b>
                <span>{z.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ts-abschnitt" id="problem">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Die Meldung ist nicht das Problem. Alles danach schon.</h2>
          <div className="ts-probleme">
            {PROBLEME.map((p) => (
              <figure key={p.titel}>
                <div className="ts-kachel" aria-hidden="true">
                  <p.icon size={44} strokeWidth={1.4} />
                </div>
                <figcaption>{p.titel}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="loesung">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Software und Handwerk aus einer Hand.</h2>
          <div className="ts-zwei">
            <figure>
              <div className="ts-buehne">
                <TeoFoto name="verwaltung" alt="Verwalterin am Laptop, im Fenster die Frauenkirche" className="ts-foto--flach" />
                <MeldungKarte />
              </div>
              <figcaption>
                <b>Die Software</b>
                <span>Für Verwaltung, Hausmeister, Mieter und Eigentümer. Inklusive.</span>
              </figcaption>
            </figure>
            <figure>
              <div className="ts-buehne">
                <TeoFoto name="handwerker" alt="Handwerker stellt ein Ventil an der Heizung ein" className="ts-foto--flach" />
                <AbnahmeKarte />
              </div>
              <figcaption>
                <b>Die Ausführung</b>
                <span>Unsere Partnerbetriebe in München. Haftung bei uns.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="ablauf">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Vom Wasserfleck bis zur Rechnung.</h2>
          <ol className="ts-icons ts-icons--vier">
            {ABLAUF.map((s, i) => (
              <li key={s.titel}>
                <span className="ts-icons__icon">
                  <s.icon size={24} strokeWidth={1.6} />
                </span>
                <h3>
                  <span className="ts-icons__nr">{i + 1}</span> {s.titel}
                </h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="rollen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Jeder im Haus sieht, was er braucht.</h2>
          <TeoRollen />
        </div>
      </section>

      <section className="ts-abschnitt" id="funktionen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Was sonst liegen bleibt.</h2>
          <ul className="ts-icons ts-icons--drei">
            {FUNKTIONEN.map((f) => (
              <li key={f.titel}>
                <span className="ts-icons__icon">
                  <f.icon size={24} strokeWidth={1.6} />
                </span>
                <h3>{f.titel}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="leistungen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Was wir erledigen.</h2>
          <ul className="ts-gewerke">
            {GEWERKE.map((g) => (
              <li key={g.name}>
                <span className="ts-gewerke__icon">
                  <g.icon size={20} strokeWidth={1.6} />
                </span>
                <span>{g.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ts-abschnitt" id="warum">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Warum teo?</h2>
          <div className="ts-vgl" role="table" aria-label="Vergleich">
            <div className="ts-vgl__zeile ts-vgl__kopf" role="row">
              <span role="columnheader" />
              <span role="columnheader">Software allein</span>
              <span role="columnheader">Handwerker direkt</span>
              <span role="columnheader" className="ts-vgl__teo">
                teo
              </span>
            </div>
            {VERGLEICH.map(([text, a, b, c]) => (
              <div key={text} className="ts-vgl__zeile" role="row">
                <span role="rowheader">{text}</span>
                <span role="cell">
                  <Haken ja={a} />
                </span>
                <span role="cell">
                  <Haken ja={b} />
                </span>
                <span role="cell" className="ts-vgl__teo">
                  <Haken ja={c} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ts-cta" id="kontakt">
        <TeoFoto name="cta" alt="Münchner Altbaustraße am Abend" className="ts-cta__bild" />
        <div className="teo-innen ts-cta__inhalt">
          <h2>Schicken Sie uns Ihren nächsten Schaden.</h2>
          <Link href={TEO_LINK_ANFRAGE} className="teo-btn teo-btn--hell">
            Anfrage stellen
          </Link>
          <a className="ts-cta__mail" href={`mailto:${MARKE.firma.email}`}>
            {MARKE.firma.email}
          </a>
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

      <div className="ts-mobil-cta">
        <Link href={TEO_LINK_ANFRAGE} className="teo-btn">
          Anfrage stellen
        </Link>
      </div>
    </TeoRahmen>
  );
}
