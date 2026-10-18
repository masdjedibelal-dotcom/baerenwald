import Link from "next/link";

import { TEO_LINK_ANFRAGE, TEO_LINK_RECHNER, TeoRahmen } from "@/components/teo/TeoRahmen";
import { MARKE } from "@/lib/marke";

const ABLAUF = [
  {
    titel: "Melden",
    text: "Schäden kommen digital an statt am Telefon — von Ihrem Team im Portal oder von Mietern per Link, mit Fotos und vollständig erfasst.",
  },
  {
    titel: "Prüfen",
    text: "Vor Ort wird der Schaden geprüft — durch Ihren Hausmeister oder durch teo. Ergebnis und Fotos stehen direkt im Vorgang.",
  },
  {
    titel: "Entscheiden",
    text: "Sie behalten die Steuerung. Akutfälle laufen bis zu Ihrer Wertgrenze direkt, darüber holt teo Vergleichsangebote ein.",
  },
  {
    titel: "Erledigt",
    text: "Termine, Nachfassen und Abnahme übernimmt teo. Protokoll, Fotos und Rechnung liegen im Portal. Die Gewährleistung trägt teo.",
  },
] as const;

const LEISTUNGEN = [
  {
    titel: "Akutfälle und Kleinreparaturen",
    text: "Rohrbruch, Heizungsausfall, Sturmschaden: Über feste Partnerbetriebe ist Kapazität auch kurzfristig da — per Direktbeauftragung, ohne Zeitverlust.",
  },
  {
    titel: "Instandhaltung und Sanierung",
    text: "Maßnahmen am Gemeinschaftseigentum, auch über mehrere Gewerke. teo koordiniert alle Betriebe, hält Termine und Budget nach und bleibt Ihr einziger Ansprechpartner.",
  },
  {
    titel: "Laufender Objektbetrieb",
    text: "Hausmeisterdienst, Gartenpflege, Treppenhausreinigung, Winterdienst — wiederkehrende Leistungen, verlässlich organisiert und dokumentiert.",
  },
  {
    titel: "Vergleichsangebote für Beschlüsse",
    text: "Eigentümerversammlung und Beirat brauchen vergleichbare Angebote. teo liefert sie einheitlich aufbereitet — fertig für die Beschlussvorlage.",
  },
] as const;

const OHNE_MIT = {
  ohne: [
    "Mieter rufen an, Rückfragen landen bei Ihnen",
    "Handwerker nachtelefonieren, Termine nachhalten",
    "Angebote fehlen für die Beschlussvorlage",
    "Der Stand steckt in E-Mails und Notizen",
  ],
  mit: [
    "Meldung mit Fotos direkt im Portal",
    "teo koordiniert Betriebe, Termine und Abnahme",
    "Vergleichsangebote kommen einheitlich aufbereitet",
    "Verwaltung und Eigentümer sehen denselben Stand",
  ],
} as const;

const ROLLEN = [
  {
    titel: "Verwaltungsleitung",
    text: "Ihr Team gewinnt Kapazität für weitere Objekte. Auch kleinere Mandate bleiben wirtschaftlich, weil die Technik bei teo läuft.",
  },
  {
    titel: "Objektbetreuung",
    text: "Der Stand jedes Vorgangs steht im Portal. Rückfragen und Nachfassen entfallen weitgehend.",
  },
  {
    titel: "Technik",
    text: "Vollständige Unterlagen, vergleichbare Angebote, geregelte Abnahmen — lückenlos dokumentiert, wenn Beirat oder Versammlung Nachweise verlangen.",
  },
] as const;

const STIMMEN = [
  { text: "Ich hab am Anfang nicht geglaubt, dass die wirklich dranbleiben. Die bleiben dran.", wer: "Objektbetreuung, München" },
  { text: "Die Mieteranrufe sind spürbar weniger geworden. Der Stand steht im Portal.", wer: "Hausverwaltung, München" },
  {
    text: "In der Eigentümerversammlung fragt keiner mehr nach dem Wasserschaden. Die haben alles selbst gesehen.",
    wer: "Verwaltungsleitung",
  },
] as const;

export const TEO_FAQ = [
  {
    frage: "Was kostet teo?",
    antwort:
      "Der Preis bleibt auf dem Niveau einer direkten Beauftragung. Gebündeltes Volumen und eingespielte Abläufe mit festen Partnern machen das möglich — ein Aufschlag auf Handwerkerleistungen fällt nicht an.",
  },
  {
    frage: "Ist teo eine Software?",
    antwort:
      "teo ist ein Dienstleister mit digitalen Abläufen. Im Portal sehen alle Beteiligten denselben Stand — Organisation und Ausführung übernimmt teo.",
  },
  {
    frage: "Was wird aus unserem Hausmeister?",
    antwort: "Er bleibt Teil des Ablaufs: Er meldet und prüft vor Ort, teo übernimmt Organisation und Ausführung.",
  },
  {
    frage: "Wer haftet, wenn etwas schiefgeht?",
    antwort:
      "teo. Mit der Übergabe eines Vorgangs übernimmt teo die Verantwortung für die fachgerechte Ausführung, einschließlich der Gewährleistung — bei einem wie bei mehreren Gewerken.",
  },
  {
    frage: "Behalten wir die Kontrolle?",
    antwort:
      "Ja. Sie entscheiden bei jedem Vorgang, ob Sie ihn selbst erledigen oder an teo übergeben. Wertgrenzen regeln die Direktbeauftragung bei Akutfällen, das Portal zeigt jederzeit den Stand.",
  },
  {
    frage: "Liefert teo auch Angebote für die Eigentümerversammlung?",
    antwort:
      "Ja. Vergleichsangebote kommen einheitlich aufbereitet und fertig für die Beschlussvorlage — mit den Unterlagen, die Beirat und Eigentümer für die Entscheidung brauchen.",
  },
  {
    frage: "Wie starten wir — und wo ist teo tätig?",
    antwort:
      "Stellen Sie eine Anfrage oder schildern Sie uns einen aktuellen Vorgang, alles Weitere klären wir in einem kurzen Gespräch. teo ist in München und Umgebung tätig.",
  },
] as const;

function Aktionen({ hell = false }: { hell?: boolean }) {
  return (
    <div className="teo-aktionen">
      <Link href={TEO_LINK_ANFRAGE} className={hell ? "teo-btn teo-btn--hell" : "teo-btn"}>
        Anfrage stellen
      </Link>
      <Link href={TEO_LINK_RECHNER} className={hell ? "teo-btn teo-btn--rand-hell" : "teo-btn teo-btn--rand"}>
        Preis berechnen
      </Link>
    </div>
  );
}

/** Kleine Vorgangsliste wie im Verwalterportal (nur Anschauung). */
function PortalVorschau() {
  const zeilen = [
    { nr: "#2481", titel: "Wasserschaden Bad", status: "In Ausführung", ton: "blau" },
    { nr: "#2478", titel: "Klingelanlage defekt", status: "Angebot", ton: "gelb" },
    { nr: "#2469", titel: "Heizung Whg. 7", status: "Termin steht", ton: "blau" },
    { nr: "#2440", titel: "Dachrinne verstopft", status: "Abgenommen", ton: "gruen" },
  ];
  return (
    <div className="teo-vorschau" aria-hidden="true">
      <div className="teo-vorschau__kopf">
        <span>
          teo <em>· Verwalterportal</em>
        </span>
        <span className="teo-vorschau__objekt">Musterstraße 12</span>
      </div>
      <ul>
        {zeilen.map((z) => (
          <li key={z.nr}>
            <span className="teo-vorschau__nr">{z.nr}</span>
            <span className="teo-vorschau__titel">{z.titel}</span>
            <span className={`teo-vorschau__status teo-vorschau__status--${z.ton}`}>{z.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeoStartseite() {
  return (
    <TeoRahmen>
      <section className="teo-hero">
        <div className="teo-innen teo-hero__raster">
          <div className="teo-hero__text">
            <p className="teo-eyebrow">Für Haus- und WEG-Verwaltungen in München</p>
            <h1>
              Sie melden.
              <br />
              teo regelt.
            </h1>
            <p className="teo-lead">
              teo übernimmt den technischen Ablauf Ihrer Objekte — von der Schadenmeldung bis zur Abnahme. Ein
              Ansprechpartner für alle Gewerke, jeder Stand im Portal.
            </p>
            <Aktionen />
            <p className="teo-hinweis">Antwort innerhalb eines Werktags · kostenlos und unverbindlich</p>
          </div>
          <PortalVorschau />
        </div>
      </section>

      <section className="teo-abschnitt">
        <div className="teo-innen teo-zweispaltig">
          <h2>Instandhaltung bindet Zeit, die der Verwaltung fehlt.</h2>
          <p className="teo-gross">
            Meldungen aufnehmen, Handwerker anfragen, Termine nachhalten, Rückfragen beantworten, dem Beirat den Stand
            erklären: Technische Vorgänge binden oft mehr Kapazität als die eigentliche Verwaltung. teo bündelt
            Meldung, Ausführung und Dokumentation in einem Ablauf — und übernimmt die Steuerung.
          </p>
        </div>
      </section>

      <section className="teo-abschnitt teo-abschnitt--grau" id="ablauf">
        <div className="teo-innen">
          <p className="teo-eyebrow">Ablauf</p>
          <h2>So läuft ein Vorgang mit teo.</h2>
          <ol className="teo-schritte">
            {ABLAUF.map((s, i) => (
              <li key={s.titel}>
                <span className="teo-schritte__nr">{i + 1}</span>
                <h3>{s.titel}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="teo-abschnitt" id="leistungen">
        <div className="teo-innen">
          <p className="teo-eyebrow">Leistungen</p>
          <h2>Was teo für Sie übernimmt.</h2>
          <div className="teo-liste">
            {LEISTUNGEN.map((l, i) => (
              <article key={l.titel}>
                <span className="teo-liste__nr">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{l.titel}</h3>
                  <p>{l.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="teo-abschnitt teo-abschnitt--dunkel" id="warum">
        <div className="teo-innen">
          <h2>Ein Ablauf. Ein Ansprechpartner. Ein Stand.</h2>
          <p className="teo-gross">
            Verwaltung, Eigentümer und Handwerker arbeiten auf demselben Stand — die Entscheidungen bleiben bei Ihnen.
          </p>
          <div className="teo-vergleich">
            <div>
              <h3>Ohne teo</h3>
              <ul>
                {OHNE_MIT.ohne.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="teo-vergleich__mit">
              <h3>Mit teo</h3>
              <ul>
                {OHNE_MIT.mit.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="teo-abschnitt">
        <div className="teo-innen">
          <p className="teo-eyebrow">Für wen</p>
          <h2>Für Verwaltungen jeder Größe.</h2>
          <div className="teo-karten">
            {ROLLEN.map((r) => (
              <article key={r.titel}>
                <h3>{r.titel}</h3>
                <p>{r.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="teo-abschnitt teo-abschnitt--grau">
        <div className="teo-innen">
          <p className="teo-eyebrow">Aus der Praxis</p>
          <div className="teo-stimmen">
            {STIMMEN.map((s) => (
              <figure key={s.text}>
                <blockquote>„{s.text}“</blockquote>
                <figcaption>{s.wer}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="teo-abschnitt">
        <div className="teo-innen teo-zweispaltig">
          <h2>Feste Partner in München und Umgebung.</h2>
          <p className="teo-gross">
            teo arbeitet mit einem festen Netzwerk von Betrieben, das über Jahre gewachsen ist. Die Partner kennen die
            Abläufe, die Kapazitäten reichen auch für größere Maßnahmen. Kommt es zu Verzögerungen, klärt teo sie — mit
            den Betrieben, im laufenden Vorgang.
          </p>
        </div>
      </section>

      <section className="teo-abschnitt teo-abschnitt--dunkel" id="kontakt">
        <div className="teo-innen teo-abschluss">
          <h2>Sprechen wir über Ihre Objekte.</h2>
          <p className="teo-gross">
            Schildern Sie uns einen aktuellen Vorgang — eine offene Schadenmeldung oder eine anstehende Maßnahme. Wir
            zeigen Ihnen, wie er mit teo laufen würde. Oder berechnen Sie vorab einen Preisrahmen.
          </p>
          <Aktionen hell />
          <p className="teo-hinweis teo-hinweis--hell">
            Lieber per E-Mail: <a href={`mailto:${MARKE.firma.email}`}>{MARKE.firma.email}</a>
          </p>
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
