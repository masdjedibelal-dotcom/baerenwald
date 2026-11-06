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

const HEUTE = [
  "Mietermeldungen prüfen und nachfragen",
  "Einen Handwerker finden, der gerade Zeit hat",
  "Hinterhertelefonieren, bis jemand kommt",
  "Termine mit Mietern und Eigentümern abstimmen",
  "Angebote einholen, vergleichen und freigeben",
  "Nachkontrolle und Rechnungen prüfen",
] as const;

const MIT_TEO = [
  "Mieter melden per QR-Code, mit Foto und Wohnung",
  "Unser Partnernetz hat auch kurzfristig jemanden frei",
  "Sie haben einen Ansprechpartner statt zehn Nummern",
  "Den Termin stimmen wir direkt mit dem Mieter ab",
  "Bis zu Ihrer Grenze legen wir los, darüber geben Sie frei",
  "Wir nehmen ab, belegen mit Fotos und rechnen einmal ab",
] as const;

/** Was teo ist und was Sie davon haben (Generalunternehmer mit eigener Software). */
const VORTEILE = [
  { icon: Network, titel: "Immer jemand verfügbar", text: "Gute Handwerker sind ausgebucht. Wir haben ein großes Netz an Betrieben in München und finden auch kurzfristig jemanden." },
  { icon: Headset, titel: "Ein Ansprechpartner für alles", text: "Ob tropfender Hahn oder Dachsanierung: Sie wenden sich an uns, nicht an zehn verschiedene Betriebe." },
  { icon: ReceiptText, titel: "Kein Aufpreis für den Generalunternehmer", text: "Meldung, Auftrag, Termin und Abrechnung laufen bei uns digital. Die gesparte Zeit berechnen wir nicht. Sie zahlen den Preis eines Fachbetriebs." },
  { icon: Smartphone, titel: "Alle sehen denselben Stand", text: "Verwaltung, Eigentümer und Mieter sehen im Portal Fortschritt, Fotos, Angebote und Rechnungen. Das erspart Rückfragen." },
  { icon: SlidersHorizontal, titel: "Weniger freigeben, weniger abstimmen", text: "Sie legen je Haus fest, bis zu welchem Betrag wir direkt beauftragen. Termine klären wir selbst mit den Mietern." },
  { icon: ShieldCheck, titel: "Wir haften", text: "Vertragspartner sind immer wir. Wir nehmen jede Arbeit ab und kümmern uns auch um spätere Mängel." },
] as const;

/** Alle Beteiligten (Vorbild Lessen „Every party connected“): Foto je Rolle, darunter teo als Klammer. */
const BETEILIGTE = [
  { foto: "rolle-verwaltung", quelle: "verwaltung", icon: Briefcase, titel: "Verwaltung", text: "Alle Häuser auf einer Seite. Freigeben nur, wenn es über Ihre Grenze geht.", alt: "Verwalterin am Laptop" },
  { foto: "rolle-mieter", quelle: null, icon: KeyRound, titel: "Mieter", text: "Melden per QR-Code im Treppenhaus, mit Foto. Ohne Konto.", alt: "Mieterin meldet einen Schaden mit dem Handy" },
  { foto: "rolle-handwerker", quelle: "handwerker", icon: Wrench, titel: "Handwerker & Hausmeister", text: "Auftrag, Termin und Fotos auf dem Handy. Hausmeister haken ihre Rundgänge ab.", alt: "Handwerker an der Heizung" },
  { foto: "rolle-eigentuemer", quelle: null, icon: Building, titel: "Eigentümer", text: "Sehen, was im Haus passiert, mit den Kosten je Haus.", alt: "Eigentümer vor seinem Haus" },
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
      "teo ist ein Handwerksbetrieb und Generalunternehmer für Hausverwaltungen in München. Sie geben uns Reparaturen, Schäden, Wartungen und Sanierungen. Wir führen selbst aus oder mit Partnerbetrieben aus allen Gewerken. Sie haben einen Ansprechpartner, bekommen eine Rechnung und sehen jeden Schritt im Portal.",
  },
  {
    frage: "Was kostet teo?",
    antwort: "So viel wie eine direkte Beauftragung. Auf die Handwerkerleistung kommt kein Aufschlag. Die Software ist dabei.",
  },
  {
    frage: "Ist teo eine Software?",
    antwort:
      "Nein. teo ist ein Handwerksbetrieb und Ihr Generalunternehmer. Wir führen selbst aus und mit Partnerbetrieben. Das Portal ist dabei, damit alle Beteiligten denselben Stand sehen.",
  },
  {
    frage: "Was wird aus unserem Hausmeister?",
    antwort: "Er bleibt. Im Portal sieht er seine Aufgaben, hakt Rundgänge ab und schaut sich Meldungen auf Wunsch zuerst selbst an. Was er nicht lösen kann, übernimmt ein Fachbetrieb.",
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
    antwort: "Ja. Sie legen pro Haus fest, bis zu welchem Betrag wir direkt beauftragen. Alles darüber geben Sie frei. Bei akuten Schäden, etwa einem Rohrbruch, legen wir sofort los.",
  },
  {
    frage: "Wo ist teo tätig?",
    antwort: "In München und Umgebung. Schicken Sie uns einen aktuellen Fall, dann richten wir Ihre Häuser ein.",
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
              Alle Gewerke. <span className="ts-hero__ganz">Ein Betrieb.</span>
            </span> <span className="ts-hero__zeile ts-hero__zeile--klein ts-blau">Für Hausverwaltungen in München.</span>
          </h1>
          <p className="ts-hero__satz">Wir nehmen Ihnen den handwerklichen Teil der Verwaltung ab. Bei Reparaturen, Schäden und Sanierungen sind wir Ihr einziger Ansprechpartner. Wir führen selbst aus oder setzen Betriebe aus unserem Partnernetz ein. Über unser Portal sehen Sie jederzeit, wo ein Auftrag steht.</p>
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
            <span>Jeder Schaden kostet Sie Stunden.</span> <span className="ts-blau">Die nehmen wir Ihnen ab.</span>
          </h2>
          <div className="ts-vorher">
            <div className="ts-vorher__karte">
              <h3>Das machen Sie heute selbst</h3>
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
              <h3>Das übernehmen wir</h3>
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
          <p className="ts-kosten__zeile">Die gewonnene Zeit können Sie in mehr Objekte stecken, ohne mehr Personal.</p>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="was-teo-ist">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>Ein Handwerksbetrieb</span> <span className="ts-blau">mit eigener Software.</span>
          </h2>
          <p className="ts-warum__satz">
            teo ist Generalunternehmer für Hausverwaltungen. Einen Teil der Arbeiten führen wir mit eigenen Handwerkern aus, für alles andere setzen wir geprüfte Partnerbetriebe ein. Den ganzen Ablauf von der Meldung bis zur Rechnung haben wir selbst digitalisiert.
          </p>
          <ul className="ts-icons ts-icons--drei ts-icons--blau">
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

      <section className="ts-abschnitt" id="ablauf">
        <div className="teo-innen">
          <h2 className="ts-zentriert-text ts-zweizeilig">
            <span>So läuft ein Auftrag.</span> <span className="ts-blau">Aus Sicht der Verwaltung.</span>
          </h2>
          <TeoAppAblauf />
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--warm" id="rollen">
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
