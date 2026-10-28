import Link from "next/link";
import {
  Check,
  DoorOpen,
  Droplets,
  Flame,
  Hammer,
  Home,
  KeyRound,
  Minus,
  PaintRoller,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trees,
  Zap,
} from "lucide-react";

import { TEO_LINK_ANFRAGE, TeoRahmen } from "@/components/teo/TeoRahmen";
import { TeoRollen } from "@/components/teo/TeoRollen";
import {
  AblaufKarte,
  AusfuehrungKarte,
  BentoAushang,
  BentoBudget,
  BentoExport,
  BentoFristen,
  BentoGrenze,
  BentoMelden,
  BentoMitteilung,
  HeroVisual,
  ProblemAnrufe,
  ProblemFragen,
  ProblemFrist,
  RolleVerwaltung,
} from "@/components/teo/TeoVisuals";
import { MARKE } from "@/lib/marke";

import "@/app/teo-start.css";

const PROBLEME = [
  { titel: "Kein Handwerker ruft zurück.", visual: <ProblemAnrufe /> },
  { titel: "Die Fristen hängen an Ihnen.", visual: <ProblemFrist /> },
  { titel: "Alle fragen nach dem Stand.", visual: <ProblemFragen /> },
] as const;

const ABLAUF = [
  { titel: "Gemeldet", text: "Per QR-Code oder App" },
  { titel: "Geprüft", text: "Wir schicken den Betrieb" },
  { titel: "Freigegeben", text: "Bis zu Ihrer Grenze direkt" },
  { titel: "Erledigt", text: "Mit Fotos und Rechnung" },
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

function Aktionen({ hell = false }: { hell?: boolean }) {
  return (
    <div className="teo-aktionen">
      <Link href={TEO_LINK_ANFRAGE} className={hell ? "teo-btn teo-btn--hell" : "teo-btn"}>
        Anfrage stellen
      </Link>
    </div>
  );
}

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

export function TeoStartseite() {
  return (
    <TeoRahmen>
      <section className="ts-hero">
        <div className="teo-innen ts-hero__raster">
          <div className="ts-hero__text">
            <h1>
              Sie verwalten.
              <br />
              <span className="ts-hero__zweite">Wir machen die Technik.</span>
            </h1>
            <Aktionen hell />
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="ts-abschnitt" id="problem">
        <div className="teo-innen">
          <h2>Die Meldung ist nicht das Problem. Alles danach schon.</h2>
          <div className="ts-probleme">
            {PROBLEME.map((p) => (
              <article key={p.titel}>
                {p.visual}
                <h3>{p.titel}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--blau" id="loesung">
        <div className="teo-innen">
          <h2>Software und Handwerk aus einer Hand.</h2>
          <div className="ts-zwei">
            <article className="ts-zwei__karte">
              <h3>Die Software</h3>
              <p>Für Verwaltung, Hausmeister, Mieter und Eigentümer. Inklusive.</p>
              <div className="ts-zwei__visual">
                <RolleVerwaltung />
              </div>
            </article>
            <article className="ts-zwei__karte">
              <h3>Die Ausführung</h3>
              <p>Unsere Partnerbetriebe in München. Haftung bei uns.</p>
              <div className="ts-zwei__visual">
                <AusfuehrungKarte />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="ablauf">
        <div className="teo-innen">
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

      <section className="ts-abschnitt ts-abschnitt--grau" id="rollen">
        <div className="teo-innen">
          <h2>Jeder im Haus sieht, was er braucht.</h2>
          <TeoRollen />
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--dunkel" id="funktionen">
        <div className="teo-innen">
          <h2>Was sonst liegen bleibt.</h2>
          <div className="ts-bento">
            <article className="ts-bento__kachel ts-bento__kachel--breit">
              <h3>Prüffristen und Wartungen</h3>
              <BentoFristen />
            </article>
            <article className="ts-bento__kachel ts-bento__kachel--hoch">
              <h3>QR-Code im Treppenhaus</h3>
              <BentoAushang />
              <BentoMelden />
            </article>
            <article className="ts-bento__kachel">
              <h3>Ihre Wertgrenze</h3>
              <BentoGrenze />
            </article>
            <article className="ts-bento__kachel">
              <h3>Budget je Haus</h3>
              <BentoBudget />
            </article>
            <article className="ts-bento__kachel">
              <h3>Mitteilung ans Haus</h3>
              <BentoMitteilung />
            </article>
            <article className="ts-bento__kachel ts-bento__kachel--breit">
              <h3>Kosten zum Export</h3>
              <BentoExport />
            </article>
          </div>
        </div>
      </section>

      <section className="ts-abschnitt" id="leistungen">
        <div className="teo-innen">
          <h2>Was wir erledigen.</h2>
          <ul className="ts-gewerke">
            {GEWERKE.map((g) => (
              <li key={g.name}>
                <g.icon size={20} />
                <span>{g.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ts-abschnitt ts-abschnitt--grau" id="warum">
        <div className="teo-innen">
          <h2>Warum teo?</h2>
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

      <section className="ts-abschnitt ts-abschnitt--dunkel ts-cta" id="kontakt">
        <div className="teo-innen ts-cta__innen">
          <h2>Schicken Sie uns Ihren nächsten Schaden.</h2>
          <div>
            <Aktionen hell />
            <p className="ts-hinweis">
              <a href={`mailto:${MARKE.firma.email}`}>{MARKE.firma.email}</a>
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
