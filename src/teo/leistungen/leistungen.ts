/**
 * TEO-Leistungsseiten (servus-teo.de/leistungen/[slug]): eine Seite je Suchabsicht von Hausverwaltungen.
 * Nur Aussagen, die zu Ablauf und Plattform passen (Freigabegrenze, Tagebuch, Schadenunterlagen, digitale Abnahme).
 */

export type TeoLeistung = {
  slug: string;
  /** <title> für Google, max. ~60 Zeichen */
  metaTitel: string;
  /** Meta-Description und Kartentext, max. ~155 Zeichen */
  beschreibung: string;
  /** Kurzname für Karten und Brotkrumen */
  name: string;
  titel: string;
  kurz: string;
  uebernehmen: string[];
  gewerke?: string[];
  ablauf: { titel: string; text: string }[];
  vorteile: string[];
  faq: { frage: string; antwort: string }[];
  ratgeber: string[];
  anfrage: { text: string; situation?: string };
};

export const LEISTUNGEN_PFAD = "/leistungen";
export const leistungPfad = (slug: string) => `${LEISTUNGEN_PFAD}/${slug}`;

const ABLAUF_STANDARD: TeoLeistung["ablauf"] = [
  { titel: "Meldung", text: "Von Ihnen, vom Mieter per QR-Code oder vom Eigentümer. Auch per E-Mail aus Ihrem eigenen System." },
  { titel: "Prüfung und Freigabe", text: "Wir prüfen vor Ort und schicken ein Angebot. Bis zu Ihrer Freigabegrenze legen wir direkt los." },
  { titel: "Ausführung", text: "Mit eigenen Handwerkern oder einem Partnerbetrieb aus unserem Netzwerk. Wir stimmen die Gewerke ab." },
  { titel: "Dokumentation", text: "Jeder Schritt mit Foto im Tagebuch. Sie sehen den Stand, ohne anzurufen." },
  { titel: "Abschluss", text: "Digitale Abnahme vor Ort, Rechnung per E-Mail." },
];

const VORTEILE_STANDARD = [
  "Ein Ansprechpartner und ein Vertrag, auch wenn mehrere Gewerke beteiligt sind.",
  "Keine Extragebühren. Aufnahme, Vorbereitung und Ausführung stehen nachvollziehbar im Angebot.",
  "Der Stand jedes Auftrags ist für Sie sichtbar, mit Fotos und Terminen.",
  "Mit der Zeit kennen wir Ihre Häuser, die Abläufe bleiben immer gleich.",
];

export const TEO_LEISTUNGEN: TeoLeistung[] = [
  {
    slug: "handwerker-fuer-hausverwaltungen",
    metaTitel: "Handwerker für Hausverwaltungen in München",
    beschreibung:
      "Ein Handwerksbetrieb für alle Gewerke Ihrer Häuser in München: Reparaturen, Sanierung, Wartung. Ein Ansprechpartner, Stand und Fotos digital.",
    name: "Handwerker für Hausverwaltungen",
    titel: "Handwerker für Hausverwaltungen in München",
    kurz:
      "Sie beauftragen uns wie einen Handwerksbetrieb. Wir nehmen den Fall auf, führen aus, so weit es geht selbst, und holen bei Bedarf Partnerbetriebe dazu. Ihr Ansprechpartner bleiben wir, der ganze Ablauf läuft digital.",
    uebernehmen: [
      "Schäden und Reparaturen in Wohnungen und Allgemeinflächen",
      "Sanierungen mit mehreren Gewerken aus einer Hand",
      "Wartungen und Prüfungen mit Frist",
      "Hausmeister, Winterdienst, Reinigung und Garten",
    ],
    gewerke: ["Sanitär", "Heizung", "Elektro", "Fenster & Türen", "Dach", "Fassade", "Maler", "Boden"],
    ablauf: ABLAUF_STANDARD,
    vorteile: VORTEILE_STANDARD,
    faq: [
      {
        frage: "Müssen wir unsere bisherigen Handwerker aufgeben?",
        antwort:
          "Nein. Sie können mit einzelnen Aufträgen oder bestimmten Gewerken starten und Ihre bestehenden Betriebe behalten. Es gibt keine Mindest- oder Pflichtaufträge.",
      },
      {
        frage: "Wer haftet, wenn ein Partnerbetrieb ausführt?",
        antwort: "Ihr Vertrag läuft mit uns, auch die Gewährleistung. Wir beauftragen und koordinieren den Partnerbetrieb.",
      },
      {
        frage: "Brauchen wir dafür eine Software?",
        antwort:
          "Nein. Die Plattform ist ohne Extragebühr dabei. Wenn Sie mit Ihrem eigenen System weiterarbeiten, läuft die Kommunikation per E-Mail.",
      },
    ],
    ratgeber: ["instandhaltung-wer-zahlt", "sanierung-weg-vergleichsangebote"],
    anfrage: { text: "Sie möchten einen ersten Auftrag übergeben oder uns kennenlernen?", situation: "abgeben" },
  },
  {
    slug: "generalunternehmer-weg-mehrfamilienhaus",
    metaTitel: "Generalunternehmer für WEG und Mehrfamilienhaus",
    beschreibung:
      "Generalunternehmer für Eigentümergemeinschaften und Mehrfamilienhäuser in München: ein Vertrag für alle Gewerke, Freigaben digital, alles dokumentiert.",
    name: "Generalunternehmer für WEG",
    titel: "Generalunternehmer für WEG und Mehrfamilienhaus",
    kurz:
      "Ein Vertragspartner für alle Gewerke Ihrer Wohnanlage. Wir koordinieren die Betriebe, Sie geben über der vereinbarten Grenze frei, und Eigentümer sehen auf Wunsch den Stand.",
    uebernehmen: [
      "Koordination aller beteiligten Gewerke unter einem Vertrag",
      "Angebote nachvollziehbar für Beschluss und Eigentümerversammlung",
      "Freigabe je Haus mit festem Betrag, Notfälle sofort",
      "Dokumentation für Eigentümer, Beirat und Versicherung",
    ],
    ablauf: ABLAUF_STANDARD,
    vorteile: [
      "Ein Vertrag statt vieler Einzelaufträge, die Gewährleistung läuft mit uns.",
      "Über unser Partnernetzwerk ist für jedes Gewerk ein Betrieb verfügbar.",
      "Eigentümer sehen, was im Haus passiert, mit den Kosten je Haus.",
      "Keine Extragebühren. Alle Leistungen stehen einzeln im Angebot.",
    ],
    faq: [
      {
        frage: "Was dürfen wir als Verwaltung ohne Beschluss beauftragen?",
        antwort:
          "Das hängt von Ihrem Verwaltervertrag und den Beschlüssen der Gemeinschaft ab. Erforderliche Freigaben und Beschlüsse stimmen wir vor der Ausführung mit Ihnen ab.",
      },
      {
        frage: "Bekommen wir Vergleichsangebote für die Versammlung?",
        antwort: "Ja. Angebote sind so aufgebaut, dass Positionen und Gewerke nachvollziehbar sind und sich vergleichen lassen.",
      },
    ],
    ratgeber: ["sanierung-weg-vergleichsangebote", "instandhaltung-wer-zahlt"],
    anfrage: { text: "Sie planen eine Maßnahme in einer Eigentümergemeinschaft?", situation: "angebote" },
  },
  {
    slug: "wasserschaden-mehrfamilienhaus-muenchen",
    metaTitel: "Wasserschaden im Mehrfamilienhaus – Hilfe in München",
    beschreibung:
      "Wasserschaden in einer Wohnanlage in München: Ursache finden, abdichten, trocknen, instand setzen. Ein Ansprechpartner, Unterlagen für die Versicherung als PDF.",
    name: "Wasserschaden im Mehrfamilienhaus",
    titel: "Wasserschaden im Mehrfamilienhaus: schnell behoben, sauber dokumentiert",
    kurz:
      "Akute Schäden beheben wir sofort, ohne auf eine Freigabe zu warten. Danach koordinieren wir Leckortung, Trocknung und Instandsetzung und erstellen die Unterlagen für die Versicherung.",
    uebernehmen: [
      "Erste Hilfe vor Ort: Wasser abstellen, Ursache suchen, sichern",
      "Leckortung und Reparatur der Leitung",
      "Trocknung und Instandsetzung von Boden, Wand und Decke",
      "Schadenunterlagen mit Ablauf, Fotos und Rechnung als PDF",
    ],
    gewerke: ["Sanitär", "Leckortung", "Trocknung", "Boden", "Maler"],
    ablauf: [
      { titel: "Meldung", text: "Der Mieter meldet per QR-Code mit Foto, oder Sie melden direkt." },
      { titel: "Sofortmaßnahme", text: "Notfälle gehen sofort raus. Wir stellen ab, sichern und finden die Ursache." },
      { titel: "Koordination", text: "Sanitär, Trocknung und Boden nacheinander abgestimmt. Mieter kennen die Termine." },
      { titel: "Dokumentation", text: "Jeder Schritt mit Foto im Tagebuch, die Schadenunterlagen gibt es als PDF." },
      { titel: "Abschluss", text: "Digitale Abnahme vor Ort, Rechnung per E-Mail." },
    ],
    vorteile: [
      "Mehrere Gewerke, ein Ansprechpartner. Sie müssen nichts koordinieren.",
      "Unterlagen für die Versicherung entstehen automatisch aus dem Tagebuch.",
      "Mieter und Eigentümer sehen den Stand, die Rückfragen bei Ihnen werden weniger.",
    ],
    faq: [
      {
        frage: "Müssen wir bei einem Wasserschaden erst freigeben?",
        antwort:
          "Nein. Notfälle, die Sie für Ihre Häuser festlegen, gehen sofort raus. Für die Instandsetzung danach bekommen Sie ein Angebot, wenn es über Ihrer Freigabegrenze liegt.",
      },
      {
        frage: "Welche Unterlagen braucht die Versicherung?",
        antwort:
          "In der Regel Schadenmeldung, Fotos, Ursache und Rechnung. Wir stellen das aus dem Tagebuch als PDF zusammen. Was Ihre Versicherung genau verlangt, steht in den Versicherungsbedingungen.",
      },
    ],
    ratgeber: ["wasserschaden-mehrfamilienhaus"],
    anfrage: { text: "Gerade ein Wasserschaden in einem Ihrer Häuser?", situation: "wasser" },
  },
  {
    slug: "sanierung-mehrfamilienhaus-muenchen",
    metaTitel: "Sanierung Mehrfamilienhaus München – alle Gewerke",
    beschreibung:
      "Sanierung im Mehrfamilienhaus in München: Dach, Fassade, Bad und Leitungen aus einer Hand. Ein Angebot für alle Gewerke, Fortschritt mit Fotos.",
    name: "Sanierung Mehrfamilienhaus",
    titel: "Sanierung im Mehrfamilienhaus: ein Angebot für alle Gewerke",
    kurz:
      "Ob Dach, Fassade, Bad oder Leitungen: Sie bekommen ein Angebot für alle Gewerke und einen Ansprechpartner für die ganze Maßnahme. Den Fortschritt sehen Sie mit Fotos im Tagebuch.",
    uebernehmen: [
      "Aufnahme vor Ort und Angebot für alle Gewerke",
      "Planung der Reihenfolge und Abstimmung der Betriebe",
      "Information der Mieter über Termine und Einschränkungen",
      "Abnahme und Dokumentation für Eigentümer und Unterlagen",
    ],
    gewerke: ["Dach", "Fassade", "Gerüst", "Maler", "Bad", "Leitungen", "Fenster & Türen"],
    ablauf: ABLAUF_STANDARD,
    vorteile: VORTEILE_STANDARD,
    faq: [
      {
        frage: "Können wir mit dem Angebot in die Eigentümerversammlung gehen?",
        antwort: "Ja. Das Angebot ist nach Gewerken und Positionen aufgebaut und lässt sich mit anderen Angeboten vergleichen.",
      },
      {
        frage: "Wer koordiniert Gerüst, Dach und Maler?",
        antwort: "Wir. Sie haben einen Ansprechpartner für die ganze Maßnahme, wir stimmen die Reihenfolge der Gewerke ab.",
      },
    ],
    ratgeber: ["sanierung-weg-vergleichsangebote", "instandhaltung-wer-zahlt"],
    anfrage: { text: "Sie brauchen ein Angebot für eine Sanierung?", situation: "angebote" },
  },
  {
    slug: "wartung-pruefpflichten-wohnanlage",
    metaTitel: "Wartung und Prüffristen für Wohnanlagen in München",
    beschreibung:
      "Wartungen und Prüfpflichten im Mehrfamilienhaus im Blick: Heizung, Rauchwarnmelder, Legionellen, Aufzug. Wird es fällig, kümmern wir uns.",
    name: "Wartung und Prüffristen",
    titel: "Wartung und Prüffristen für Wohnanlagen",
    kurz:
      "Für jedes Haus stehen Wartungen und Prüfungen mit Frist an einer Stelle. Wird eine Prüfung fällig, legen wir automatisch einen Auftrag an und kümmern uns um die Ausführung.",
    uebernehmen: [
      "Übersicht aller Prüffristen je Haus",
      "Heizungswartung, Rauchwarnmelder, Trinkwasser auf Legionellen",
      "Aufzug, Spielplatz, Feuerlöscher, Dachrinnen",
      "Nachweise und Protokolle in der digitalen Objektakte",
    ],
    ablauf: [
      { titel: "Erfassen", text: "Wir legen die Prüfungen und Wartungen je Haus mit Intervall an." },
      { titel: "Fällig", text: "Rechtzeitig vor dem Termin entsteht automatisch ein Auftrag bei uns." },
      { titel: "Ausführung", text: "Mit eigenen Handwerkern oder einem Fachbetrieb aus unserem Netzwerk." },
      { titel: "Nachweis", text: "Protokoll und Fotos liegen in der Objektakte, die nächste Frist ist gesetzt." },
    ],
    vorteile: [
      "Keine Frist geht verloren, auch bei vielen Häusern.",
      "Nachweise liegen an einer Stelle, falls Eigentümer oder Versicherung fragen.",
      "Ein Ansprechpartner für alle Prüfungen statt vieler Wartungsfirmen.",
    ],
    faq: [
      {
        frage: "Welche Prüfungen sind im Mehrfamilienhaus Pflicht?",
        antwort:
          "In Bayern vor allem Rauchwarnmelder jährlich, Trinkwasser auf Legionellen bei entsprechenden Anlagen alle drei Jahre und der Aufzug regelmäßig. Eine Übersicht steht in unserem Ratgeber.",
      },
      {
        frage: "Können wir bestehende Wartungsverträge behalten?",
        antwort: "Ja. Sie können einzelne Prüfungen an uns geben und die übrigen wie bisher laufen lassen.",
      },
    ],
    ratgeber: ["pruefpflichten-mehrfamilienhaus", "rauchwarnmelder-bayern", "legionellenpruefung-trinkwasser"],
    anfrage: { text: "Bei Ihnen laufen Prüffristen ab?", situation: "pruefungen" },
  },
  {
    slug: "hausmeister-winterdienst-wohnanlage-muenchen",
    metaTitel: "Hausmeister und Winterdienst für Wohnanlagen München",
    beschreibung:
      "Hausmeister, Winterdienst, Reinigung und Garten für Wohnanlagen in München. Checklisten am Handy, Mieter und Eigentümer sehen, wann erledigt.",
    name: "Hausmeister und Winterdienst",
    titel: "Hausmeister, Winterdienst und Garten für Wohnanlagen",
    kurz:
      "Wiederkehrende Leistungen vereinbaren wir einmal, danach laufen sie. Erledigtes wird am Handy abgehakt, und auf Wunsch sehen Mieter und Eigentümer, wann zuletzt gereinigt oder geräumt wurde.",
    uebernehmen: [
      "Hausmeister-Rundgänge und kleine Reparaturen",
      "Winterdienst mit Räumen und Streuen",
      "Treppenhausreinigung und Mülltonnen",
      "Gartenpflege und Grünflächen",
    ],
    ablauf: [
      { titel: "Vereinbaren", text: "Wir legen fest, was wie oft passiert, je Haus als Plan mit Checkliste." },
      { titel: "Erledigen", text: "Das Team hakt die Punkte am Handy ab, mit Foto, wenn nötig." },
      { titel: "Sichtbar", text: "Sie sehen den Stand je Haus. Auf Wunsch auch Mieter und Eigentümer." },
      { titel: "Melden", text: "Fällt etwas auf, entsteht direkt ein Auftrag, ohne Umweg über Sie." },
    ],
    vorteile: [
      "Ein Ansprechpartner für Hausmeister, Winterdienst, Reinigung und Garten.",
      "Nachweis, was wann erledigt wurde, etwa beim Winterdienst.",
      "Weniger Rückfragen von Mietern, weil sie den Stand selbst sehen.",
    ],
    faq: [
      {
        frage: "Was passiert, wenn unser Hausmeister wegfällt?",
        antwort: "Wir übernehmen die Aufgaben im Haus, auf Wunsch zuerst für ein einzelnes Objekt.",
      },
      {
        frage: "Wie wird der Winterdienst nachgewiesen?",
        antwort: "Jeder Einsatz wird im Plan abgehakt, mit Datum. So ist nachvollziehbar, wann geräumt und gestreut wurde.",
      },
    ],
    ratgeber: ["winterdienst-muenchen"],
    anfrage: { text: "Ihr Hausmeister fällt weg oder der Winterdienst fehlt?", situation: "hausmeister" },
  },
];

export function teoLeistung(slug: string): TeoLeistung | undefined {
  return TEO_LEISTUNGEN.find((l) => l.slug === slug);
}
