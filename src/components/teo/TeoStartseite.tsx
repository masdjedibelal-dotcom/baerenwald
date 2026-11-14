import Link from "next/link";
import {
  Briefcase,
  Building,
  CalendarClock,
  Check,
  Droplets,
  FileText,
  Flame,
  Headset,
  KeyRound,
  type LucideIcon,
  Network,
  PaintRoller,
  Repeat,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Snowflake,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { TeoAblaufKarte } from "@/components/teo/TeoAblaufKarte";
import { TeoEffekte } from "@/components/teo/TeoEffekte";
import { fotoDa, TeoFoto } from "@/components/teo/TeoFoto";
import { TEO_LINK_ANFRAGE, TeoLogo, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoAppAblauf } from "@/components/teo/TeoAppAblauf";
import { TeoIcon3D } from "@/components/teo/TeoIcon3D";
import { TEO_USPS } from "@/components/teo/teo-usps";
import { TEO_SITUATIONEN } from "@/lib/funnel/teo-anfrage";
import { RATGEBER_PFAD, ratgeberArtikel, type RatgeberArtikel } from "@/teo/ratgeber/artikel";
import { TeoRatgeberKarte } from "@/teo/ratgeber/TeoRatgeber";
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

/** Vergleich ohne / mit teo: je Zeile ein Problem und unsere Antwort darauf. */
const HEUTE = [
  "Sie telefonieren zwischen Mieter, Handwerker und Eigentümer hin und her",
  "Keiner weiß, wo ein Auftrag gerade steht",
  "Gute Handwerker haben keine Zeit",
  "Sie nehmen Arbeiten ab, ohne Fachmann zu sein",
] as const;

const MIT_TEO = [
  "Ein Ansprechpartner koordiniert alles",
  "Alle sehen denselben Stand, mit Fotos",
  "Unser Netz hat auch kurzfristig jemanden",
  "Wir nehmen fachlich ab und kümmern uns um Mängel",
] as const;

/** Was teo ist und was Sie davon haben (Generalunternehmer mit eigener Software). */
const VORTEILE = [
  { icon: Network, bild: "netzwerk", titel: "Immer jemand verfügbar", text: "Unser Netz aus Betrieben in München hat auch kurzfristig jemanden frei." },
  { icon: Headset, bild: "headset", titel: "Ein Ansprechpartner für alles", text: "Ob tropfender Hahn oder neues Dach: Sie rufen uns an, nicht zehn Betriebe." },
  { icon: ReceiptText, bild: "rechnung", titel: "Kein Aufschlag", text: "Sie zahlen den Preis eines Fachbetriebs. Für die Koordination berechnen wir nichts extra." },
  { icon: Smartphone, bild: "handy", titel: "Alle sehen denselben Stand", text: "Verwaltung, Eigentümer und Mieter sehen Fotos, Angebote und Rechnungen, im Portal oder per E-Mail." },
  { icon: SlidersHorizontal, bild: "regler", titel: "Weniger freigeben", text: "Sie legen je Haus eine Grenze fest. Darunter beauftragen wir direkt. Termine klären wir mit den Mietern." },
  { icon: ShieldCheck, bild: "schild", titel: "Wir übernehmen die Gewährleistung", text: "Ihr Vertragspartner sind immer wir. Wir nehmen jede Arbeit ab und kümmern uns um spätere Mängel." },
] as const;

/** Leistungen in drei Arten, je Karte die Gewerke (keine Links). */
const LEISTUNGEN = [
  { icon: Wrench, bild: "schraubenschluessel", titel: "Schäden & Reparaturen", satz: "Bis zu Ihrer Grenze legen wir sofort los.", gewerke: ["Sanitär", "Heizung", "Elektro", "Fenster & Türen"] },
  { icon: PaintRoller, bild: "farbrolle", titel: "Sanieren", satz: "Ein Angebot für alle Gewerke.", gewerke: ["Dach", "Fassade", "Maler", "Bad & Leitungen"] },
  { icon: Repeat, bild: "kalender", titel: "Wiederkehrende Leistungen", satz: "Einmal vereinbart, läuft es.", gewerke: ["Hausmeister", "Reinigung", "Winterdienst", "Garten"] },
] as const;

/** Alle Beteiligten (Vorbild Lessen „Every party connected“): Foto je Rolle, darunter teo als Klammer. */
const BETEILIGTE = [
  { foto: "hero-verwaltung", quelle: null, icon: Briefcase, titel: "Verwaltung", text: "Alle Häuser auf einer Seite. Freigeben nur, wenn es über Ihre Grenze geht.", alt: "Illustration: Hausverwalter am Laptop" },
  { foto: "rolle-mieter-illu", quelle: null, icon: KeyRound, titel: "Mieter", text: "Melden per QR-Code im Treppenhaus, mit Foto. Ohne Konto.", alt: "Illustration: Mieterin scannt den QR-Aushang im Treppenhaus" },
  { foto: "rolle-hausmeister", quelle: null, icon: Wrench, titel: "Handwerker & Hausmeister", text: "Auftrag, Termin und Fotos auf dem Handy. Hausmeister haken ihre Rundgänge ab.", alt: "Illustration: Hausmeister mit Klemmbrett im Innenhof" },
  { foto: "hero-eigentuemer", quelle: null, icon: Building, titel: "Eigentümer", text: "Sehen, was im Haus passiert, mit den Kosten je Haus.", alt: "Illustration: Eigentümerin zuhause mit dem Handy" },
] as const;

/** Icons der Pillen „Was ist bei Ihnen gerade los?“ (erscheinen beim Drüberfahren) */
const SITUATION_ICON: Record<string, LucideIcon> = {
  heizung: Flame,
  wasser: Droplets,
  strom: Zap,
  angebote: FileText,
  pruefungen: CalendarClock,
  hausmeister: KeyRound,
  winter: Snowflake,
  abgeben: Building,
};

/** Drei Ratgeber-Beiträge auf der Startseite (interne Links für Google) */
const RATGEBER_START = ["pruefpflichten-mehrfamilienhaus", "wasserschaden-mehrfamilienhaus", "sanierung-weg-vergleichsangebote"]
  .map(ratgeberArtikel)
  .filter((a): a is RatgeberArtikel => Boolean(a));

export const TEO_FAQ = [
  {
    frage: "Was macht teo genau?",
    antwort:
      "Wir sind ein Handwerksbetrieb und Generalunternehmer für Verwaltungen in München. Sie geben uns Schäden, Reparaturen, Wartungen und Sanierungen. Wir erledigen sie selbst oder mit Partnerbetrieben. Sie haben einen Ansprechpartner und bekommen eine Rechnung.",
  },
  {
    frage: "Was kostet teo?",
    antwort: "So viel wie eine direkte Beauftragung. Auf die Handwerkerleistung kommt kein Aufschlag. Die Software ist dabei.",
  },
  {
    frage: "Ist teo eine Software?",
    antwort:
      "Nein, ein Handwerksbetrieb. Unser Portal gibt es dazu. Sie können es nutzen oder ganz per E-Mail mit uns arbeiten: Aufträge schicken, Angebote freigeben, Rechnungen bekommen.",
  },
  {
    frage: "Was wird aus unserem Hausmeister?",
    antwort: "Er bleibt. Er sieht seine Aufgaben auf dem Handy und schaut sich Meldungen auf Wunsch zuerst an. Was er nicht lösen kann, übernimmt ein Fachbetrieb.",
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
    antwort: "Notfälle haben Vorrang. Wie schnell jemand da ist, hängt von Gewerk und Uhrzeit ab. Das sagen wir Ihnen sofort.",
  },
  {
    frage: "Behalten wir die Kontrolle?",
    antwort: "Ja. Sie legen pro Haus fest, bis zu welchem Betrag wir direkt beauftragen. Alles darüber geben Sie frei. Bei akuten Schäden, etwa einem Rohrbruch, legen wir sofort los.",
  },
  {
    frage: "Wo ist teo tätig?",
    antwort: "In München und Umgebung.",
  },
] as const;

export function TeoStartseite() {
  return (
    <TeoRahmen>
      <TeoEffekte />
      <section className="ts-hero">
        <div className="ts-formen" aria-hidden="true">
          <span className="ts-formen__blau" />
          <span className="ts-formen__gold" />
          <span className="ts-formen__rot" />
        </div>
        <div className="teo-innen ts-hero__kopf">
          <h1>
            <span className="ts-hero__zeile">
              Handwerk <span className="ts-hero__ganz">aus einer Hand.</span>
            </span> <span className="ts-hero__zeile ts-hero__zeile--klein ts-blau">Für Verwaltungen in München.</span>
          </h1>
          <p className="ts-hero__satz">Ob Rohrbruch, Heizungsausfall, defekte Klingel oder neue Fassade: Sie geben uns den Fall, wir erledigen den Rest. Wir nehmen den Schaden auf, schicken den passenden Betrieb, nehmen die Arbeit ab und halten alles mit Fotos fest. Sie sehen jeden Schritt digital.</p>
          <div className="teo-aktionen ts-zentriert">
            <Link href={TEO_LINK_ANFRAGE} className="teo-btn">
              Anfrage stellen
            </Link>
          </div>
        </div>
        <div className="ts-breit">
          <div className="ts-buehne ts-buehne--hero">
            <div className="ts-hero-reihe">
              <TeoFoto name="hero-handwerker" alt="Illustration: Handwerker repariert das Waschbecken, die Mieterin schaut zu" className="ts-hero-reihe__gross" />
              <TeoFoto name="hero-verwaltung" alt="Illustration: Hausverwalter sieht am Laptop, dass der Auftrag erledigt ist" className="ts-hero-reihe__klein" />
              <TeoFoto name="hero-eigentuemer" alt="Illustration: Eigentümerin bekommt die Erledigt-Nachricht aufs Handy" className="ts-hero-reihe__klein" />
            </div>
            <TeoAblaufKarte />
          </div>
        </div>
        <ul className="teo-innen ts-usp-leiste">
          {TEO_USPS.map((u) => (
            <li key={u.text}>
              <span className="ts-usp-leiste__icon ts-usp-leiste__icon--bild">
                <TeoIcon3D name={u.bild} size={40} />
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
            <span>Jeder Schaden kostet Sie Stunden.</span> <span className="ts-blau">Die nehmen wir Ihnen ab.</span>
          </h2>
          <div className="ts-vorher">
            <div className="ts-vorher__karte">
              <h3>Ohne teo</h3>
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
              <h3>Mit teo</h3>
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
          <p className="ts-kosten__zeile">So betreuen Sie mehr Häuser mit demselben Team.</p>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--eng" id="leistungen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text">Was wir übernehmen.</h2>
          <ul className="ts-leistungen">
            {LEISTUNGEN.map((l) => (
              <li key={l.titel} className="ts-leistungen__karte">
                <TeoIcon3D name={l.bild} size={72} className="ts-leistungen__bild" />
                <h3>{l.titel}</h3>
                <p>{l.satz}</p>
                <ul className="ts-leistungen__gewerke">
                  {l.gewerke.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="was-teo-ist">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Ein Handwerksbetrieb</span> <span className="ts-blau">mit eigener Software.</span>
          </h2>
          <p className="ts-warum__satz">
            Einen Teil der Arbeiten machen wir mit eigenen Handwerkern, für alles andere haben wir geprüfte Partnerbetriebe. Den Ablauf von der Meldung bis zur Rechnung haben wir selbst digitalisiert.
          </p>
          <ul className="ts-icons ts-icons--drei ts-icons--blau">
            {VORTEILE.map((f) => (
              <li key={f.titel}>
                <TeoIcon3D name={f.bild} size={72} className="ts-icons__bild" />
                <h3>{f.titel}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TeoAppAblauf />

      <section className="ts-abschnitt" id="rollen">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Alle sehen</span> <span className="ts-blau">denselben Stand.</span>
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
                  <Link href={`${TEO_LINK_ANFRAGE}?s=${s.id}`}>
                    {(() => {
                      const Icon = SITUATION_ICON[s.id];
                      return Icon ? (
                        <span className="ts-einstieg__icon" aria-hidden="true">
                          <Icon size={16} strokeWidth={2} />
                        </span>
                      ) : null;
                    })()}
                    {s.label}
                  </Link>
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

      <section className="ts-abschnitt ts-abschnitt--warm" id="ratgeber">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Wissen für Verwaltungen.</span> <span className="ts-blau">Kurz und verlässlich.</span>
          </h2>
          <div className="tr-raster ts-ratgeber">
            {RATGEBER_START.map((a) => (
              <TeoRatgeberKarte key={a.slug} a={a} />
            ))}
          </div>
          <p className="ts-ratgeber__alle">
            <Link href={RATGEBER_PFAD} className="teo-btn teo-btn--rand">
              Alle Beiträge
            </Link>
          </p>
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
              <span>Schaden, Wartung, Sanierung?</span> <span className="ts-ende__blau">Machen wir.</span>
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
          <TeoFoto name="ende-haeuser" alt="Illustration: Münchner Altbau-Häuserzeile im Abendlicht" className="ts-ende__bild" />
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
