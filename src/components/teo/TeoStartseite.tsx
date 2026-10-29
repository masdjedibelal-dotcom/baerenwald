import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  Check,
  ClipboardCheck,
  FileSpreadsheet,
  Hammer,
  Headset,
  Megaphone,
  Minus,
  Network,
  Smartphone,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import { TeoAblaufKarte } from "@/components/teo/TeoAblaufKarte";
import { TeoFoto } from "@/components/teo/TeoFoto";
import { TEO_LINK_ANFRAGE, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoRollen } from "@/components/teo/TeoRollen";
import { TeoSchritte } from "@/components/teo/TeoSchritte";
import { MARKE } from "@/lib/marke";

import "@/app/teo-start.css";

const ZIELGRUPPEN = [
  "Hausverwaltungen",
  "WEG-Verwaltungen",
  "Mietverwaltungen",
  "Eigentümergemeinschaften",
  "Wohnungsunternehmen",
  "Genossenschaften",
  "Family Offices",
  "Eigentümer mehrerer Häuser",
] as const;

const HEUTE = [
  "Handwerker suchen und nachtelefonieren",
  "Termine mit Mietern abstimmen",
  "Den Stand per Telefon und Mail erfragen",
  "Rechnungen ohne Nachweis prüfen",
  "Prüffristen selbst im Kopf behalten",
] as const;

const MIT_TEO = [
  "Eine Meldung genügt, wir übernehmen",
  "Handwerker und Termin organisieren wir",
  "Den Stand sehen Sie jederzeit in der App",
  "Abnahme mit Fotos, Rechnung geprüft",
  "Prüffristen laufen von selbst",
] as const;

const FUNKTIONEN = [
  { icon: CalendarClock, titel: "Prüffristen", text: "Wir beauftragen Wartungen, bevor die Frist abläuft." },
  { icon: Megaphone, titel: "Mitteilung ans Haus", text: "Einmal schreiben, im Treppenhaus und online für alle." },
  { icon: FileSpreadsheet, titel: "Kosten-Export", text: "Alle Ausgaben je Haus, fertig für die Abrechnung." },
] as const;

/** Fluss-Grafik (Vorbild Lessen): was rein kommt, wie wir es machen, was Sie davon haben. */
const UEBERNEHMEN = [
  { icon: Wrench, text: "Schäden und Reparaturen" },
  { icon: CalendarClock, text: "Wartung und Prüffristen" },
  { icon: Sparkles, text: "Laufender Betrieb" },
  { icon: Hammer, text: "Sanierungen und Maßnahmen" },
] as const;

const SO_MACHEN_WIR_ES = [
  { icon: Network, titel: "Partnerbetriebe in München", text: "Geprüft, für alle Gewerke." },
  { icon: Smartphone, titel: "Die App", text: "Meldung, Stand, Fotos und Rechnung an einem Ort." },
  { icon: Headset, titel: "Ihr teo-Team", text: "Koordiniert, prüft und haftet." },
] as const;

const DAVON_HABEN = [
  "Ein Ansprechpartner für alles",
  "Jeder Stand sichtbar",
  "Rechnungen geprüft",
  "Kosten im Budget",
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
    frage: "Ist teo eine Software?",
    antwort:
      "Wir sind Ihr Dienstleister für alles Technische. Wir organisieren, beauftragen und prüfen. Die App ist dabei, damit Sie jederzeit den Stand sehen.",
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
          <h1>
            <span className="ts-hero__zeile">
              Kein <span className="ts-hero__ganz">Handwerker-Aufwand.</span>
            </span> <span className="ts-hero__zeile">Mehr Zeit fürs Verwalten.</span>
          </h1>
          <p className="ts-hero__satz">teo übernimmt alles, von der Meldung bis zur Ausführung durch den Handwerker.</p>
          <div className="teo-aktionen ts-zentriert">
            <Link href={TEO_LINK_ANFRAGE} className="teo-btn">
              Anfrage stellen
            </Link>
          </div>
        </div>
        <div className="ts-breit">
          <div className="ts-buehne ts-buehne--hero">
            <TeoFoto name="hero" alt="Handwerker mit Werkzeugkoffer im Treppenhaus eines Altbaus" />
            <TeoAblaufKarte />
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--eng" id="fuer-wen">
        <div className="teo-innen">
          <div className="ts-fuerwen">
            <div className="ts-fuerwen__kopf">
              <h2>Für alle, die Häuser verwalten.</h2>
              <Link href={TEO_LINK_ANFRAGE} className="teo-btn">
                Anfrage stellen
              </Link>
            </div>
            <ul className="ts-fuerwen__liste">
              {ZIELGRUPPEN.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="problem">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Jeder Schaden ist ein kleines Projekt.</span> <span className="ts-blau">Und kostet Sie Stunden.</span>
          </h2>
          <div className="ts-vorher">
            <div className="ts-vorher__karte">
              <h3>Heute koordinieren Sie selbst.</h3>
              <ul>
                {HEUTE.map((t) => (
                  <li key={t}>
                    <span className="ts-vorher__zeichen ts-vorher__zeichen--nein" aria-hidden="true">
                      <X size={14} strokeWidth={2.5} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ts-vorher__karte ts-vorher__karte--teo">
              <h3>Mit teo melden Sie nur noch.</h3>
              <ul>
                {MIT_TEO.map((t) => (
                  <li key={t}>
                    <span className="ts-vorher__zeichen" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="loesung">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Jeder Auftrag. Ein Ablauf.</span> <span className="ts-blau">Ein Ansprechpartner.</span>
          </h2>
          <div className="ts-fluss">
            <div className="ts-fluss__spalte">
              <h3 className="ts-fluss__marke">Was wir übernehmen</h3>
              <ul className="ts-fluss__liste">
                {UEBERNEHMEN.map((u) => (
                  <li key={u.text}>
                    <span className="ts-fluss__icon">
                      <u.icon size={18} strokeWidth={1.8} />
                    </span>
                    {u.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ts-fluss__mitte">
              <h3>So machen wir es</h3>
              <ul>
                {SO_MACHEN_WIR_ES.map((m) => (
                  <li key={m.titel}>
                    <span className="ts-fluss__icon ts-fluss__icon--hell">
                      <m.icon size={20} strokeWidth={1.8} />
                    </span>
                    <span>
                      <b>{m.titel}</b>
                      <small>{m.text}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ts-fluss__spalte">
              <h3 className="ts-fluss__marke ts-fluss__marke--blau">Was Sie davon haben</h3>
              <ul className="ts-fluss__liste">
                {DAVON_HABEN.map((t) => (
                  <li key={t}>
                    <span className="ts-fluss__icon ts-fluss__icon--blau">
                      <Check size={16} strokeWidth={2.6} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="ablauf">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Vom Wasserfleck</span> <span className="ts-blau">bis zur Rechnung.</span>
          </h2>
          <TeoSchritte />
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="funktionen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Woran wir denken, damit Sie es nicht müssen.</h2>
          <div className="ts-zwei ts-zwei--fotos">
            <div className="ts-buehne">
              <TeoFoto name="handwerker" alt="Handwerker stellt ein Ventil an der Heizung ein" className="ts-foto--flach" />
              <AbnahmeKarte />
            </div>
            <div className="ts-buehne">
              <TeoFoto name="verwaltung" alt="Verwalterin am Laptop, im Fenster die Frauenkirche" className="ts-foto--flach" />
              <MeldungKarte />
            </div>
          </div>
          <ul className="ts-icons ts-icons--drei ts-icons--blau">
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

      <section className="ts-abschnitt" id="warum">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Mehr als Software.</h2>
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

      <section className="ts-abschnitt ts-abschnitt--warm" id="rollen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Jeder im Haus sieht, was er braucht.</h2>
          <TeoRollen />
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
