import Link from "next/link";
import {
  Briefcase,
  Building,
  CalendarClock,
  Check,
  ClipboardCheck,
  Hammer,
  Handshake,
  Headset,
  KeyRound,
  Network,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import { TeoAblaufKarte } from "@/components/teo/TeoAblaufKarte";
import { fotoDa, TeoFoto } from "@/components/teo/TeoFoto";
import { TEO_LINK_ANFRAGE, TeoLogo, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoSchritte } from "@/components/teo/TeoSchritte";
import { TEO_USPS } from "@/components/teo/teo-usps";
import { TEO_SITUATIONEN } from "@/lib/funnel/teo-anfrage";
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

/** Kern-USPs: kurz unter dem Hero, ausführlich in „Was Sie bei teo bekommen“. */

const VORTEILE = [
  { icon: Handshake, titel: "Wir übernehmen alles", text: "Von der Meldung bis zur bezahlten Rechnung." },
  { icon: Headset, titel: "Ein Ansprechpartner", text: "Für jedes Haus und jedes Gewerk derselbe." },
  { icon: ReceiptText, titel: "Eine Rechnung", text: "Wir sind Ihr Vertragspartner, nicht zehn Betriebe." },
  { icon: ShieldCheck, titel: "Haftung und Gewährleistung", text: "Wir haften und kümmern uns auch um spätere Mängel." },
  { icon: ClipboardCheck, titel: "Geprüft und abgenommen", text: "Jede Arbeit abgenommen und mit Fotos belegt." },
  { icon: Network, titel: "Partnernetz in München", text: "Geprüfte Betriebe für alle Gewerke in Ihrer Nähe." },
  { icon: SlidersHorizontal, titel: "Sie behalten die Kontrolle", text: "Unter Ihrer Wertgrenze direkt, darüber entscheiden Sie." },
  { icon: CalendarClock, titel: "Prüffristen im Blick", text: "Wartungen beauftragen wir, bevor die Frist abläuft." },
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
  "Eine Rechnung von uns",
  "Kosten im Budget",
] as const;

/** Kosten-Beispiel (Vorbild Lessen „Total cost to maintain“): gleiche Rechnung, anderer Aufwand. */
const RECHNUNG = [
  ["Leckortung", "380,00 €"],
  ["Rohr erneuert", "640,00 €"],
  ["Trocknung, 10 Tage", "1.460,00 €"],
] as const;

const OHNE_TEO = ["9 Telefonate", "3 Rechnungen von 3 Betrieben", "2 verschobene Termine", "Unterlagen für die Versicherung"] as const;

const MIT_TEO_KOSTEN = [
  "Kein Aufschlag auf die Rechnung",
  "Eine Rechnung, wir sind Vertragspartner",
  "Unterlagen für die Versicherung fertig",
  "Software inklusive",
] as const;

/** Alle Beteiligten (Vorbild Lessen „Every party connected“): Foto je Rolle, darunter teo als Klammer. */
const BETEILIGTE = [
  { foto: "rolle-verwaltung", quelle: "verwaltung", icon: Briefcase, titel: "Verwaltung", text: "Alle Häuser auf einer Seite. Freigeben mit einem Klick.", alt: "Verwalterin am Laptop" },
  { foto: "rolle-mieter", quelle: null, icon: KeyRound, titel: "Mieter & Hausmeister", text: "Melden per QR-Code oder App, ganz ohne Anruf.", alt: "Mieterin meldet einen Schaden mit dem Handy" },
  { foto: "rolle-handwerker", quelle: "handwerker", icon: Wrench, titel: "Handwerker", text: "Auftrag, Termin und Abnahme direkt auf dem Handy.", alt: "Handwerker an der Heizung" },
  { foto: "rolle-eigentuemer", quelle: null, icon: Building, titel: "Eigentümer", text: "Sehen, was im Haus passiert, mit den Kosten je Haus.", alt: "Eigentümer vor seinem Haus" },
] as const;

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
    antwort: "Wir. Mit der Übergabe sind wir für die Ausführung verantwortlich. Taucht später ein Mangel auf, kümmern wir uns um die Gewährleistung.",
  },
  {
    frage: "Wer ist unser Vertragspartner?",
    antwort: "teo. Sie bekommen eine Rechnung von uns, auch wenn mehrere Betriebe beteiligt waren.",
  },
  {
    frage: "Wie schnell kommt jemand?",
    antwort: "Notfälle haben bei uns Vorrang. Wie schnell jemand vor Ort ist, hängt von Gewerk und Uhrzeit ab. Das sagen wir Ihnen sofort.",
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

function Rechnung({ von }: { von: string }) {
  return (
    <div className="ts-kosten__rechnung" aria-hidden="true">
      <div className="ts-kosten__rkopf">
        <b>Rechnung</b>
        <small>Wasserschaden Keller · {von}</small>
      </div>
      {RECHNUNG.map(([posten, betrag]) => (
        <div key={posten} className="ts-kosten__posten">
          <span>{posten}</span>
          <span>{betrag}</span>
        </div>
      ))}
      <div className="ts-kosten__summe">
        <span>Summe</span>
        <span>2.480,00 €</span>
      </div>
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
        <ul className="teo-innen ts-usp-leiste">
          {TEO_USPS.map((u) => (
            <li key={u.text}>
              <span className="ts-usp-leiste__icon">
                <u.icon size={20} strokeWidth={1.8} />
              </span>
              {u.text}
            </li>
          ))}
        </ul>
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
          <h2 className="ts-zentriert-text">Was Sie bei teo bekommen.</h2>
          <ul className="ts-icons ts-icons--vier ts-icons--blau">
            {VORTEILE.map((f) => (
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
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Die Rechnung ist nicht das Teure.</span> <span className="ts-blau">Die Zeit drumherum schon.</span>
          </h2>
          <div className="ts-kosten">
            <div className="ts-kosten__karte">
              <h3>Ohne teo</h3>
              <Rechnung von="3 Betriebe" />
              <ul>
                {OHNE_TEO.map((t) => (
                  <li key={t}>
                    <span className="ts-kosten__zeichen ts-kosten__zeichen--plus" aria-hidden="true">
                      +
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="ts-kosten__aufwand">
                Ihr Aufwand <b>etwa 6 Stunden</b>
              </p>
            </div>
            <div className="ts-kosten__karte ts-kosten__karte--teo">
              <h3>Mit teo</h3>
              <Rechnung von="teo" />
              <ul>
                {MIT_TEO_KOSTEN.map((t) => (
                  <li key={t}>
                    <span className="ts-kosten__zeichen" aria-hidden="true">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="ts-kosten__aufwand">
                Ihr Aufwand <b>2 Minuten</b>
              </p>
            </div>
          </div>
          <p className="ts-kosten__zeile">Software allein repariert nichts. Handwerker allein koordinieren nicht. teo macht beides.</p>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="rollen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Alle Beteiligten.</span> <span className="ts-blau">Ein Stand.</span>
          </h2>
          <div className="ts-beteiligte">
            <ul className="ts-beteiligte__karten">
              {BETEILIGTE.map((b) => (
                <li key={b.titel}>
                  <TeoFoto
                    name={b.quelle && !fotoDa(b.foto) ? b.quelle : b.foto}
                    alt={b.alt}
                    className="ts-beteiligte__foto"
                    ersatz={
                      <span className="ts-beteiligte__ersatz" aria-hidden="true">
                        <b.icon size={40} strokeWidth={1.4} />
                      </span>
                    }
                  />
                  <h3>{b.titel}</h3>
                  <p>{b.text}</p>
                </li>
              ))}
            </ul>
            <div className="ts-beteiligte__system">
              <span className="ts-beteiligte__logo" aria-hidden="true">
                <TeoLogo hell />
              </span>
              <p>
                <b>Verbindet alle.</b> Ein Vorgang, ein Stand, für jeden die passende Ansicht.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--eng" id="einstieg">
        <div className="teo-innen">
          <div className="ts-einstieg">
            <h2 className="ts-zentriert-text ts-zweizeilig">
              <span>Was ist bei Ihnen</span> <span className="ts-blau">gerade los?</span>
            </h2>
            <ul className="ts-einstieg__liste">
              {TEO_SITUATIONEN.map((s) => (
                <li key={s.id}>
                  <Link href={`${TEO_LINK_ANFRAGE}?s=${s.id}`}>{s.label}</Link>
                </li>
              ))}
              <li>
                <Link href={TEO_LINK_ANFRAGE} className="ts-einstieg__anderes">
                  Etwas anderes
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="faq">
        <div className="teo-innen">
          <div className="ts-faq">
            <h2 className="ts-zentriert-text">Häufige Fragen.</h2>
            <div className="teo-faq ts-faq__liste">
              {TEO_FAQ.map((f, i) => (
                <details key={f.frage} open={i === 0}>
                  <summary>{f.frage}</summary>
                  <p>{f.antwort}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ts-ende" id="kontakt">
        <div className="ts-formen ts-formen--dunkel" aria-hidden="true">
          <span className="ts-formen__blau" />
          <span className="ts-formen__gold" />
          <span className="ts-formen__rot" />
        </div>
        <div className="teo-innen ts-ende__innen">
          <div className="ts-ende__text">
            <h2 className="ts-zweizeilig">
              <span>Schicken Sie uns</span> <span className="ts-ende__blau">Ihren nächsten Schaden.</span>
            </h2>
            <div className="ts-ende__aktionen">
              <Link href={TEO_LINK_ANFRAGE} className="teo-btn teo-btn--hell">
                Anfrage stellen
              </Link>
              <a className="ts-ende__mail" href={`mailto:${MARKE.firma.email}`}>
                {MARKE.firma.email}
              </a>
            </div>
          </div>
          <TeoFoto name="cta" alt="Münchner Altbaustraße am Abend" className="ts-ende__bild" />
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
