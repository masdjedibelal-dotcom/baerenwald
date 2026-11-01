/**
 * TEO-Ratgeber (servus-teo.de/ratgeber): Wissen für Verwaltungen, WEG und Bestandshalter.
 * Jede Seite beantwortet eine konkrete Frage — Kurzantwort zuerst (wird von Google/KI zitiert), dann Details.
 * Rechtliche Angaben: Stand im Feld `aktualisiert`, vorsichtig formuliert, Grundlage immer genannt.
 */

export type RatgeberBlock =
  | { typ: "text"; text: string }
  | { typ: "liste"; punkte: string[] }
  | { typ: "schritte"; punkte: { titel: string; text: string }[] }
  | { typ: "tabelle"; kopf: string[]; zeilen: string[][] }
  | { typ: "hinweis"; text: string };

export type RatgeberAbschnitt = { id: string; titel: string; bloecke: RatgeberBlock[] };

export type RatgeberKategorie = "Wartung & Prüfung" | "Schaden & Versicherung" | "Eigentümergemeinschaft" | "Betrieb & Pflichten";

export type RatgeberArtikel = {
  slug: string;
  kategorie: RatgeberKategorie;
  titel: string;
  /** <title> für Google, max. ~60 Zeichen */
  metaTitel: string;
  /** Meta-Description und Kartentext, max. ~155 Zeichen */
  beschreibung: string;
  /** Direkte Antwort auf die Kernfrage — steht oben im Artikel */
  kurzantwort: string;
  lesezeitMin: number;
  /** ISO-Datum der letzten fachlichen Prüfung */
  aktualisiert: string;
  abschnitte: RatgeberAbschnitt[];
  faq: { frage: string; antwort: string }[];
  verwandt: string[];
  /** Passender Einstieg ins Anfrageformular (TEO_SITUATIONEN-ID) */
  anfrage: { text: string; situation?: string };
};

export const RATGEBER_KATEGORIEN: RatgeberKategorie[] = [
  "Wartung & Prüfung",
  "Schaden & Versicherung",
  "Eigentümergemeinschaft",
  "Betrieb & Pflichten",
];

export const TEO_RATGEBER: RatgeberArtikel[] = [
  {
    slug: "pruefpflichten-mehrfamilienhaus",
    kategorie: "Wartung & Prüfung",
    titel: "Prüfpflichten im Mehrfamilienhaus: alle Fristen auf einen Blick",
    metaTitel: "Prüfpflichten Mehrfamilienhaus: Fristen-Übersicht",
    beschreibung:
      "Rauchwarnmelder, Legionellen, Aufzug, Heizung, Rückstau, Spielplatz: welche Prüfung wie oft fällig ist und wer sie im Mehrfamilienhaus übernimmt.",
    kurzantwort:
      "In einem Mehrfamilienhaus in Bayern sind vor allem fällig: Rauchwarnmelder jährlich, Trinkwasser auf Legionellen alle drei Jahre (bei zentraler Warmwasser-Großanlage mit Duschen), Aufzug alle zwei Jahre mit Zwischenprüfung, Feuerstätten nach dem Feuerstättenbescheid des Schornsteinfegers. Dazu kommen Wartungen, die Normen vorgeben oder empfehlen, etwa für Rückstauverschluss, Spielplatz und Blitzschutz.",
    lesezeitMin: 6,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "uebersicht",
        titel: "Die Fristen im Überblick",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Anlage", "Wie oft", "Grundlage", "Wer prüft"],
            zeilen: [
              ["Rauchwarnmelder", "jährlich", "Art. 46 Abs. 4 BayBO, DIN 14676", "Fachkraft oder Bewohner, je nach Regelung"],
              ["Trinkwasser (Legionellen)", "alle 3 Jahre", "Trinkwasserverordnung", "akkreditiertes Labor"],
              ["Aufzug", "Hauptprüfung alle 2 Jahre, dazwischen Zwischenprüfung", "Betriebssicherheitsverordnung", "zugelassene Überwachungsstelle (z. B. TÜV, DEKRA)"],
              ["Feuerstätte / Abgasanlage", "laut Feuerstättenbescheid", "Schornsteinfeger-Handwerksgesetz, Kehr- und Überprüfungsordnung", "Schornsteinfeger"],
              ["Heizungsanlage", "Wartung jährlich empfohlen", "Herstellerangaben", "Heizungsfachbetrieb"],
              ["Rückstauverschluss", "Wartung halbjährlich", "DIN 1986-100, DIN EN 13564", "Fachkundiger"],
              ["Kinderspielplatz", "laufende Sichtkontrolle, Funktionskontrolle alle 1–3 Monate, Hauptinspektion jährlich", "DIN EN 1176-7", "sachkundige Person"],
              ["Blitzschutz", "meist Sichtprüfung alle 2 Jahre, umfassende Prüfung alle 4 Jahre", "DIN EN 62305-3", "Elektrofachkraft"],
              ["Feuerlöscher (falls vorhanden)", "alle 2 Jahre", "DIN 14406-4", "Sachkundiger"],
              ["Elektroanlage Allgemeinbereiche", "keine feste Frist, Prüfung etwa alle 4 Jahre üblich", "DIN VDE 0105-100", "Elektrofachkraft"],
            ],
          },
          {
            typ: "hinweis",
            text: "Die Intervalle sind typische Werte. Maßgeblich sind der Feuerstättenbescheid, Herstellerangaben, Auflagen aus Prüfberichten und die konkrete Anlage im Haus.",
          },
        ],
      },
      {
        id: "warum",
        titel: "Warum die Fristen wichtig sind",
        bloecke: [
          {
            typ: "text",
            text: "Wer ein Haus vermietet oder verwaltet, trägt die Verkehrssicherungspflicht. Passiert ein Schaden und war eine Prüfung überfällig, drohen Haftung und Streit mit der Versicherung. Umgekehrt ist eine dokumentierte Prüfung der beste Nachweis, dass alles getan wurde.",
          },
          {
            typ: "liste",
            punkte: [
              "Haftung: Bei Unfällen prüfen Gerichte, ob die üblichen Kontrollen stattgefunden haben.",
              "Versicherung: Versicherer können Leistungen kürzen, wenn vereinbarte Wartungen fehlen.",
              "Behörden: Bei Legionellen und Aufzügen gibt es Melde- und Stilllegungspflichten.",
            ],
          },
        ],
      },
      {
        id: "zustaendig",
        titel: "Wer zuständig ist",
        bloecke: [
          {
            typ: "text",
            text: "Im Mietshaus ist der Eigentümer verantwortlich, meist organisiert durch die Mietverwaltung. In der Eigentümergemeinschaft ist die Gemeinschaft für das Gemeinschaftseigentum zuständig; die WEG-Verwaltung beauftragt die Prüfungen nach § 27 WEG als laufende Verwaltung. Für Anlagen im Sondereigentum, etwa eine Gastherme in der Wohnung, ist der jeweilige Eigentümer zuständig.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Kosten auf Mieter umlegen",
        bloecke: [
          {
            typ: "text",
            text: "Viele Prüfkosten sind Betriebskosten nach der Betriebskostenverordnung und können umgelegt werden, wenn der Mietvertrag das vorsieht: etwa Aufzugsprüfung, Legionellenuntersuchung als Teil der Wasserversorgung, Schornsteinfeger und Wartung der Heizung. Reparaturen, die bei einer Prüfung auffallen, sind dagegen Instandhaltung und trägt der Eigentümer.",
          },
        ],
      },
      {
        id: "planen",
        titel: "So behalten Sie den Überblick",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Anlagen erfassen", text: "Je Haus festhalten, was vorhanden ist: Aufzug, Warmwasserspeicher, Rückstau, Spielplatz, Blitzschutz." },
              { titel: "Fristen hinterlegen", text: "Letzte Prüfung und Intervall eintragen, damit das nächste Datum feststeht." },
              { titel: "Rechtzeitig beauftragen", text: "Prüfungen etwa vier bis sechs Wochen vor Fälligkeit beauftragen, bei Laboren und Prüfstellen gibt es Wartezeiten." },
              { titel: "Nachweise ablegen", text: "Prüfberichte und Mängel mit Datum archivieren und Mängel nachverfolgen." },
            ],
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Ist ein E-Check im Mehrfamilienhaus Pflicht?",
        antwort: "Für die Elektroanlage eines Wohnhauses gibt es keine allgemeine gesetzliche Prüffrist. Für die Allgemeinbereiche ist eine regelmäßige Prüfung durch eine Elektrofachkraft trotzdem üblich und dient als Nachweis der Verkehrssicherung.",
      },
      {
        frage: "Wie oft muss der Aufzug geprüft werden?",
        antwort: "Nach der Betriebssicherheitsverordnung ist alle zwei Jahre eine Hauptprüfung durch eine zugelassene Überwachungsstelle fällig, in der Mitte dazwischen eine Zwischenprüfung.",
      },
      {
        frage: "Wer kümmert sich in der WEG um die Prüfungen?",
        antwort: "Die WEG-Verwaltung. Prüfungen am Gemeinschaftseigentum gehören zur laufenden Verwaltung nach § 27 WEG und brauchen in der Regel keinen eigenen Beschluss.",
      },
    ],
    verwandt: ["rauchwarnmelder-bayern", "legionellenpruefung-trinkwasser", "winterdienst-muenchen"],
    anfrage: { text: "teo plant und beauftragt alle Prüfungen Ihrer Häuser rechtzeitig, mit Nachweis im Portal.", situation: "pruefungen" },
  },
  {
    slug: "rauchwarnmelder-bayern",
    kategorie: "Wartung & Prüfung",
    titel: "Rauchwarnmelder in Bayern: Wer muss einbauen, wer prüfen?",
    metaTitel: "Rauchwarnmelder Bayern: Pflichten für Eigentümer",
    beschreibung:
      "Welche Räume Rauchwarnmelder brauchen, wer sie einbaut und wer sie jährlich prüft: die Regeln der Bayerischen Bauordnung für Vermieter und WEG.",
    kurzantwort:
      "In Bayern müssen in Wohnungen alle Schlafräume, Kinderzimmer und Flure, über die Aufenthaltsräume erreicht werden, mindestens einen Rauchwarnmelder haben (Art. 46 Abs. 4 BayBO). Einbauen muss der Eigentümer. Für die Betriebsbereitschaft sind die Bewohner zuständig, außer der Eigentümer übernimmt das selbst. Üblich ist eine jährliche Prüfung nach DIN 14676.",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "raeume",
        titel: "Welche Räume einen Melder brauchen",
        bloecke: [
          {
            typ: "liste",
            punkte: ["Schlafzimmer", "Kinderzimmer", "Flure, über die Aufenthaltsräume erreicht werden"],
          },
          {
            typ: "text",
            text: "Küche und Bad sind nicht vorgeschrieben. Wohnzimmer nur, wenn darin geschlafen wird, etwa in einer Einzimmerwohnung.",
          },
        ],
      },
      {
        id: "pflichten",
        titel: "Wer was tun muss",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Aufgabe", "Zuständig"],
            zeilen: [
              ["Einbau bzw. Nachrüstung", "Eigentümer"],
              ["Betriebsbereitschaft sicherstellen", "Bewohner, also Mieter oder selbstnutzender Eigentümer"],
              ["Ausnahme", "Übernimmt der Eigentümer die Wartung, liegt sie bei ihm"],
            ],
          },
          {
            typ: "text",
            text: "Viele Vermieter übernehmen die Wartung bewusst selbst und lassen sie durch eine Fachfirma erledigen. So ist sie einheitlich dokumentiert und hängt nicht von jedem einzelnen Mieter ab.",
          },
        ],
      },
      {
        id: "weg",
        titel: "Rauchwarnmelder in der Eigentümergemeinschaft",
        bloecke: [
          {
            typ: "text",
            text: "Die Gemeinschaft kann beschließen, Rauchwarnmelder in allen Wohnungen einheitlich einbauen und warten zu lassen. Der Bundesgerichtshof hat das für zulässig gehalten (BGH, Urteil vom 8. Februar 2013, V ZR 238/11). Ein einheitlicher Dienstleister vereinfacht Prüfung und Nachweis.",
          },
        ],
      },
      {
        id: "pruefung",
        titel: "Was bei der jährlichen Prüfung passiert",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Sichtprüfung: Melder vorhanden, unbeschädigt, Raucheintrittsöffnungen frei",
              "Funktionstest des Warnsignals",
              "Prüfung der Batterie bzw. Stromversorgung",
              "Kontrolle, ob sich die Raumnutzung geändert hat",
              "Protokoll je Wohnung",
            ],
          },
          {
            typ: "text",
            text: "Moderne Funkmelder können sich teilweise selbst prüfen. Dann entfällt der Termin in der Wohnung ganz oder teilweise.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Können die Wartungskosten auf Mieter umgelegt werden?",
        antwort: "Die Wartung kann als Betriebskosten umgelegt werden, wenn der Mietvertrag das vorsieht. Kosten für die Miete der Geräte sind nach dem Bundesgerichtshof nicht umlagefähig (BGH, Urteil vom 11. Mai 2022, VIII ZR 379/20).",
      },
      {
        frage: "Gilt die Pflicht auch für ältere Wohnungen?",
        antwort: "Ja. Bestehende Wohnungen mussten bis Ende 2017 nachgerüstet sein.",
      },
    ],
    verwandt: ["pruefpflichten-mehrfamilienhaus", "instandhaltung-wer-zahlt"],
    anfrage: { text: "teo übernimmt Einbau, jährliche Prüfung und Protokoll für alle Wohnungen eines Hauses.", situation: "pruefungen" },
  },
  {
    slug: "legionellenpruefung-trinkwasser",
    kategorie: "Wartung & Prüfung",
    titel: "Legionellenprüfung: Wann sie Pflicht ist und was bei einem Befund zu tun ist",
    metaTitel: "Legionellenprüfung Pflicht: Fristen und Ablauf",
    beschreibung:
      "Wann Vermieter das Trinkwasser auf Legionellen untersuchen lassen müssen, wie oft, und was bei Überschreitung des Maßnahmenwerts zu tun ist.",
    kurzantwort:
      "Eine Legionellenuntersuchung ist alle drei Jahre Pflicht, wenn im vermieteten Haus eine Großanlage zur Trinkwassererwärmung mit Duschen betrieben wird: Speicher über 400 Liter oder mehr als 3 Liter Wasser in einer Leitung zwischen Erwärmer und Zapfstelle. Liegt der Befund über 100 KBE je 100 ml, muss der Betreiber das Gesundheitsamt informieren und Maßnahmen einleiten.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "pflicht",
        titel: "Wann die Prüfung Pflicht ist",
        bloecke: [
          {
            typ: "text",
            text: "Die Trinkwasserverordnung verlangt die Untersuchung, wenn alle drei Bedingungen zutreffen:",
          },
          {
            typ: "liste",
            punkte: [
              "Es gibt eine Großanlage zur Trinkwassererwärmung: Speicher mit mehr als 400 Litern oder mehr als 3 Liter Inhalt in mindestens einer Leitung zwischen Erwärmer und Entnahmestelle.",
              "Es gibt Duschen oder andere Stellen, an denen Wasser vernebelt wird.",
              "Das Wasser wird im Rahmen einer gewerblichen Tätigkeit abgegeben, dazu zählt die Vermietung.",
            ],
          },
          {
            typ: "text",
            text: "Häuser mit Durchlauferhitzern oder Gasthermen in den Wohnungen sind in der Regel nicht betroffen.",
          },
        ],
      },
      {
        id: "ablauf",
        titel: "So läuft die Untersuchung ab",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Probenahmestellen", text: "An Speicheraustritt, Zirkulationsrücklauf und den entferntesten Strängen müssen Probenahmeventile vorhanden sein." },
              { titel: "Probenahme", text: "Ein akkreditiertes Labor entnimmt die Proben und wertet sie aus." },
              { titel: "Befund", text: "Das Ergebnis erhält der Betreiber, bei Überschreitung auch das Gesundheitsamt." },
              { titel: "Dokumentation", text: "Befunde aufbewahren und die nächste Untersuchung in drei Jahren einplanen." },
            ],
          },
        ],
      },
      {
        id: "befund",
        titel: "Was bei einem positiven Befund zu tun ist",
        bloecke: [
          {
            typ: "text",
            text: "Der technische Maßnahmenwert liegt bei 100 koloniebildenden Einheiten je 100 Milliliter. Wird er überschritten, muss der Betreiber unverzüglich handeln:",
          },
          {
            typ: "liste",
            punkte: [
              "Gesundheitsamt informieren",
              "Ursache klären lassen, in der Regel durch eine Gefährdungsanalyse",
              "Bewohner informieren",
              "Maßnahmen umsetzen, etwa Temperatur anheben, Leitungen spülen, tote Leitungen entfernen",
              "Nachuntersuchung beauftragen",
            ],
          },
          {
            typ: "hinweis",
            text: "Als Richtwert für einen hygienischen Betrieb gelten mindestens 60 °C am Speicheraustritt und höchstens 5 Kelvin Abkühlung im Zirkulationsrücklauf (DVGW-Arbeitsblatt W 551).",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Darf ich die Kosten auf die Mieter umlegen?",
        antwort: "Ja, die Kosten der Legionellenuntersuchung gehören zu den Kosten der Wasserversorgung und sind als Betriebskosten umlegbar, wenn der Mietvertrag das vorsieht.",
      },
      {
        frage: "Gilt die Pflicht auch für eine selbst genutzte Eigentumswohnung?",
        antwort: "Nein, wenn kein Wasser im Rahmen einer Vermietung abgegeben wird. In gemischt genutzten Häusern mit zentraler Anlage gilt sie für die Anlage insgesamt.",
      },
    ],
    verwandt: ["pruefpflichten-mehrfamilienhaus", "wasserschaden-mehrfamilienhaus"],
    anfrage: { text: "teo beauftragt Labor und Probenahme, prüft die Ventile und kümmert sich bei einem Befund um die Maßnahmen.", situation: "pruefungen" },
  },
  {
    slug: "wasserschaden-mehrfamilienhaus",
    kategorie: "Schaden & Versicherung",
    titel: "Wasserschaden im Mehrfamilienhaus: Ablauf, Versicherung, Trocknung",
    metaTitel: "Wasserschaden Mehrfamilienhaus: Ablauf und Versicherung",
    beschreibung:
      "Was nach einem Wasserschaden im Mehrfamilienhaus zu tun ist, welche Versicherung zahlt und welche Unterlagen die Versicherung braucht.",
    kurzantwort:
      "Bei einem Wasserschaden zuerst das Wasser stoppen und den Schaden begrenzen, dann alles mit Fotos dokumentieren und den Schaden unverzüglich der Gebäudeversicherung melden. Danach folgen Leckortung, Reparatur, Trocknung und die Instandsetzung. Schäden am Gebäude zahlt die Gebäudeversicherung, Schäden an Möbeln die Hausratversicherung der Bewohner.",
    lesezeitMin: 6,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "sofort",
        titel: "Die ersten Stunden",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Wasser stoppen", text: "Absperrventil der Wohnung oder den Hauptabsperrhahn im Keller schließen." },
              { titel: "Sicherheit", text: "Bei Wasser in der Nähe von Elektrik die Sicherung abschalten." },
              { titel: "Schaden begrenzen", text: "Wasser aufnehmen, Möbel und Gegenstände in Sicherheit bringen." },
              { titel: "Dokumentieren", text: "Fotos von Schadenstelle, Ausmaß und betroffenen Räumen, mit Datum." },
              { titel: "Melden", text: "Versicherung unverzüglich informieren, betroffene Bewohner und die Verwaltung benachrichtigen." },
            ],
          },
          {
            typ: "hinweis",
            text: "Versicherte müssen den Schaden möglichst gering halten und schnell melden. Wer das versäumt, riskiert Kürzungen.",
          },
        ],
      },
      {
        id: "versicherung",
        titel: "Welche Versicherung zahlt",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Versicherung", "Zahlt für", "Wer hat sie"],
            zeilen: [
              ["Gebäudeversicherung (Leitungswasser)", "Schäden am Gebäude: Böden, Wände, Leitungen, Leckortung, Trocknung", "Eigentümer bzw. die Gemeinschaft"],
              ["Hausratversicherung", "bewegliche Sachen in der Wohnung: Möbel, Geräte, Teppiche", "Bewohner"],
              ["Haftpflichtversicherung", "Schäden, die jemand schuldhaft verursacht hat, etwa durch eine undichte Waschmaschine", "Verursacher"],
            ],
          },
        ],
      },
      {
        id: "ablauf",
        titel: "Leckortung, Trocknung, Instandsetzung",
        bloecke: [
          {
            typ: "text",
            text: "Ist die Ursache nicht sichtbar, findet ein Fachbetrieb das Leck mit Feuchtemessung, Wärmebild oder Druckprüfung. Nach der Reparatur werden Estrich und Wände technisch getrocknet. Das dauert je nach Bauteil meist zwei bis vier Wochen. Erst wenn die Messung trocken zeigt, beginnt die Instandsetzung: Estrich, Putz, Boden und Anstrich.",
          },
        ],
      },
      {
        id: "unterlagen",
        titel: "Unterlagen für die Versicherung",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Schadenmeldung mit Datum, Ort und Ursache",
              "Fotos vor, während und nach den Arbeiten",
              "Bericht der Leckortung",
              "Trocknungsprotokoll mit Messwerten",
              "Angebote und Rechnungen der Betriebe",
            ],
          },
          {
            typ: "text",
            text: "Je vollständiger die Unterlagen, desto schneller reguliert die Versicherung. Am einfachsten ist es, wenn alles an einer Stelle gesammelt wird.",
          },
        ],
      },
      {
        id: "weg",
        titel: "Besonderheit in der Eigentümergemeinschaft",
        bloecke: [
          {
            typ: "text",
            text: "Liegt die Ursache im Gemeinschaftseigentum, etwa an einer Steigleitung, kümmert sich die Verwaltung über die Gebäudeversicherung der Gemeinschaft. Betrifft der Schaden auch Sondereigentum wie den Bodenbelag einer Wohnung, ist das oft ebenfalls über die Gebäudeversicherung gedeckt. Entscheidend sind Teilungserklärung und Versicherungsvertrag.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Darf der Mieter bei einem Wasserschaden die Miete mindern?",
        antwort: "Ja, solange die Wohnung nur eingeschränkt nutzbar ist, etwa wegen Trocknungsgeräten oder gesperrter Räume. Die Höhe hängt vom Einzelfall ab.",
      },
      {
        frage: "Wer zahlt den Strom für die Trocknungsgeräte?",
        antwort: "Die Stromkosten der Trocknung sind in der Regel Teil des Schadens und werden von der Gebäudeversicherung erstattet. Dafür den Zählerstand zu Beginn und Ende festhalten.",
      },
    ],
    verwandt: ["instandhaltung-wer-zahlt", "legionellenpruefung-trinkwasser"],
    anfrage: { text: "teo kommt mit Notdienst und Leckortung, organisiert die Trocknung und stellt die Unterlagen für die Versicherung zusammen.", situation: "wasser" },
  },
  {
    slug: "sanierung-weg-vergleichsangebote",
    kategorie: "Eigentümergemeinschaft",
    titel: "Sanierung in der WEG: Vergleichsangebote und Beschluss",
    metaTitel: "Sanierung WEG: Vergleichsangebote und Beschluss",
    beschreibung:
      "Wie viele Angebote eine Eigentümergemeinschaft für eine Sanierung braucht, welche Mehrheit nötig ist und was die Verwaltung allein entscheiden darf.",
    kurzantwort:
      "Erhaltungsmaßnahmen am Gemeinschaftseigentum beschließt die Eigentümerversammlung mit einfacher Mehrheit. Bei größeren Aufträgen verlangen Gerichte in der Regel mehrere, meist drei vergleichbare Angebote als Entscheidungsgrundlage; fehlen sie, kann der Beschluss angefochten werden. Kleinere und dringende Maßnahmen darf die Verwaltung nach § 27 WEG ohne Beschluss beauftragen.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "wer-entscheidet",
        titel: "Wer entscheidet",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Maßnahme", "Entscheidung"],
            zeilen: [
              ["Kleine Reparatur, keine erheblichen Kosten", "Verwaltung allein (§ 27 Abs. 1 WEG)"],
              ["Dringende Maßnahme, etwa Rohrbruch", "Verwaltung allein (§ 27 Abs. 1 WEG)"],
              ["Maßnahmen bis zu einer beschlossenen Wertgrenze", "Verwaltung, wenn die Gemeinschaft das beschlossen hat (§ 27 Abs. 2 WEG)"],
              ["Größere Erhaltung, etwa Dach oder Fassade", "Eigentümerversammlung, einfache Mehrheit"],
              ["Bauliche Veränderung, etwa Aufzug neu", "Eigentümerversammlung (§ 20 WEG)"],
            ],
          },
          {
            typ: "text",
            text: "Viele Gemeinschaften beschließen eine Wertgrenze, bis zu der die Verwaltung ohne Rückfrage beauftragen darf. Das beschleunigt kleine Reparaturen erheblich.",
          },
        ],
      },
      {
        id: "angebote",
        titel: "Vergleichsangebote richtig einholen",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Gleiche Leistungsbeschreibung für alle Betriebe, sonst sind die Angebote nicht vergleichbar",
              "In der Regel drei Angebote bei größeren Maßnahmen",
              "Angebote mit der Einladung zur Versammlung verschicken, damit alle sich vorbereiten können",
              "Eine kurze Gegenüberstellung: Preis, Leistungsumfang, Termin, Gewährleistung",
            ],
          },
          {
            typ: "hinweis",
            text: "Ein Beschluss kann innerhalb eines Monats angefochten werden (§ 45 WEG). Eine saubere Entscheidungsgrundlage ist der beste Schutz dagegen.",
          },
        ],
      },
      {
        id: "finanzierung",
        titel: "Finanzierung",
        bloecke: [
          {
            typ: "text",
            text: "Bezahlt wird aus der Erhaltungsrücklage oder über eine Sonderumlage. Beides beschließt die Versammlung. Die Kosten werden nach dem geltenden Verteilerschlüssel aufgeteilt, meist nach Miteigentumsanteilen.",
          },
        ],
      },
      {
        id: "versammlung",
        titel: "Gut vorbereitet in die Versammlung",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Zustand feststellen", text: "Begehung mit Fotos, bei Bedarf mit Gutachter." },
              { titel: "Leistung beschreiben", text: "Was genau gemacht werden soll, in einer Beschreibung für alle Betriebe." },
              { titel: "Angebote einholen", text: "Mehrere Betriebe, gleiche Grundlage, Rückfragen klären." },
              { titel: "Beschlussvorlage", text: "Maßnahme, Auftragnehmer, Kostenrahmen und Finanzierung in einem Antrag." },
            ],
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Muss es immer genau drei Angebote geben?",
        antwort: "Eine feste gesetzliche Zahl gibt es nicht. In der Rechtsprechung haben sich bei größeren Maßnahmen drei vergleichbare Angebote als Standard durchgesetzt. Bei kleinen Aufträgen oder wenn es nur wenige Anbieter gibt, können weniger genügen.",
      },
      {
        frage: "Darf die Verwaltung den günstigsten Betrieb einfach beauftragen?",
        antwort: "Nur im Rahmen ihrer Befugnisse nach § 27 WEG. Bei größeren Maßnahmen entscheidet die Versammlung, nicht unbedingt für den günstigsten, sondern für das wirtschaftlich sinnvollste Angebot.",
      },
    ],
    verwandt: ["instandhaltung-wer-zahlt", "pruefpflichten-mehrfamilienhaus"],
    anfrage: { text: "teo erstellt vergleichbare Angebote für Ihre Versammlung und setzt die beschlossene Maßnahme um.", situation: "angebote" },
  },
  {
    slug: "winterdienst-muenchen",
    kategorie: "Betrieb & Pflichten",
    titel: "Winterdienst in München: Pflichten, Zeiten und Haftung",
    metaTitel: "Winterdienst München: Räumpflicht, Zeiten, Haftung",
    beschreibung:
      "Wann in München Gehwege geräumt sein müssen, was gestreut werden darf, wann die Pflicht auf Mieter übertragen werden kann und wer bei einem Sturz haftet.",
    kurzantwort:
      "In München müssen Gehwege vor dem Grundstück werktags von 7 bis 20 Uhr und an Sonn- und Feiertagen von 8 bis 20 Uhr geräumt und bei Glätte gestreut sein. Zuständig ist der Eigentümer. Er kann die Aufgabe auf Mieter oder einen Dienstleister übertragen, muss aber kontrollieren, dass sie erledigt wird. Streusalz ist auf Gehwegen nur in Ausnahmefällen erlaubt.",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "zeiten",
        titel: "Wann geräumt sein muss",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Tage", "Zeitraum"],
            zeilen: [
              ["Montag bis Samstag", "7 bis 20 Uhr"],
              ["Sonn- und Feiertage", "8 bis 20 Uhr"],
            ],
          },
          {
            typ: "text",
            text: "Fällt tagsüber neuer Schnee oder bildet sich Glätte, muss erneut geräumt und gestreut werden, so oft es nötig ist. Geregelt ist das in der Münchner Verordnung zur Reinigung und Sicherung der Gehbahnen im Winter.",
          },
        ],
      },
      {
        id: "umfang",
        titel: "Was geräumt werden muss",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Gehweg vor dem Grundstück, so breit, dass Fußgänger sicher aneinander vorbeikommen",
              "Zugänge zum Haus und zu Mülltonnen",
              "Hauseigene Wege und Treppen außen",
            ],
          },
          {
            typ: "text",
            text: "Gestreut wird mit abstumpfenden Mitteln wie Splitt oder Sand. Streusalz ist auf Gehwegen nur in Ausnahmefällen erlaubt, etwa bei Eisregen, auf Treppen oder an starken Gefällen.",
          },
        ],
      },
      {
        id: "uebertragen",
        titel: "Pflicht auf Mieter oder Dienstleister übertragen",
        bloecke: [
          {
            typ: "text",
            text: "Die Pflicht kann per Mietvertrag auf Mieter übertragen werden; ein Aushang oder die Hausordnung allein reichen meist nicht. Häufiger und verlässlicher ist ein Winterdienst durch Hausmeister oder Fachfirma. In beiden Fällen bleibt beim Eigentümer eine Kontrollpflicht: Er muss stichprobenartig prüfen, ob geräumt wird.",
          },
          {
            typ: "hinweis",
            text: "Ein Räumprotokoll mit Datum, Uhrzeit und Maßnahme ist bei einem Unfall der wichtigste Nachweis.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Kosten",
        bloecke: [
          {
            typ: "text",
            text: "Die Kosten eines beauftragten Winterdienstes können als Betriebskosten auf die Mieter umgelegt werden, wenn der Mietvertrag das vorsieht.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Wer haftet, wenn jemand auf dem Gehweg stürzt?",
        antwort: "Grundsätzlich der Pflichtige, also der Eigentümer oder derjenige, auf den die Pflicht wirksam übertragen wurde. Der Eigentümer haftet auch dann, wenn er seine Kontrollpflicht vernachlässigt hat.",
      },
      {
        frage: "Muss nachts geräumt werden?",
        antwort: "Außerhalb der Zeiten von 7 bzw. 8 bis 20 Uhr besteht in München keine allgemeine Räumpflicht.",
      },
    ],
    verwandt: ["pruefpflichten-mehrfamilienhaus", "instandhaltung-wer-zahlt"],
    anfrage: { text: "teo übernimmt den Winterdienst für Ihre Häuser, mit Räumprotokoll im Portal.", situation: "winter" },
  },
  {
    slug: "instandhaltung-wer-zahlt",
    kategorie: "Eigentümergemeinschaft",
    titel: "Instandhaltung: Wer zahlt was – Gemeinschaft, Eigentümer, Mieter?",
    metaTitel: "Instandhaltung: Wer zahlt? WEG, Eigentümer, Mieter",
    beschreibung:
      "Gemeinschaftseigentum oder Sondereigentum, Instandhaltung oder Betriebskosten, Kleinreparaturen: wer bei Reparaturen im Mehrfamilienhaus die Kosten trägt.",
    kurzantwort:
      "In der Eigentümergemeinschaft zahlt die Gemeinschaft Reparaturen am Gemeinschaftseigentum wie Dach, Fassade, Steigleitungen und meist Fenster; der einzelne Eigentümer zahlt für sein Sondereigentum wie Innentüren oder Bodenbeläge. Im Mietverhältnis trägt der Vermieter die Instandhaltung. Mieter zahlen nur Kleinreparaturen, wenn der Mietvertrag eine wirksame Klausel enthält.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "weg",
        titel: "In der Eigentümergemeinschaft",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Bauteil", "In der Regel"],
            zeilen: [
              ["Dach, Fassade, tragende Wände", "Gemeinschaftseigentum"],
              ["Steigleitungen, Heizung, Aufzug", "Gemeinschaftseigentum"],
              ["Fenster und Wohnungseingangstür", "meist Gemeinschaftseigentum"],
              ["Innentüren, Bodenbelag, Fliesen", "Sondereigentum"],
              ["Waschbecken, WC, Dusche", "Sondereigentum"],
            ],
          },
          {
            typ: "text",
            text: "Maßgeblich ist die Teilungserklärung. Die Kosten für das Gemeinschaftseigentum werden nach Miteigentumsanteilen verteilt, sofern die Gemeinschaft keinen anderen Schlüssel beschlossen hat (§ 16 Abs. 2 WEG).",
          },
        ],
      },
      {
        id: "miete",
        titel: "Im Mietverhältnis",
        bloecke: [
          {
            typ: "text",
            text: "Der Vermieter muss die Wohnung in einem vertragsgemäßen Zustand erhalten (§ 535 BGB). Reparaturen trägt also er. Mieter zahlen nur, was der Mietvertrag wirksam auf sie überträgt, oder Schäden, die sie selbst verursacht haben.",
          },
          {
            typ: "liste",
            punkte: [
              "Kleinreparaturklausel: nur für Teile, die der Mieter häufig benutzt, etwa Wasserhähne, Lichtschalter, Fenstergriffe",
              "Gerichte akzeptieren Einzelbeträge von etwa 100 bis 120 Euro je Reparatur",
              "und eine Obergrenze pro Jahr von etwa 6 bis 8 Prozent der Jahresnettokaltmiete",
              "Ist die Klausel unwirksam, zahlt der Vermieter alles",
            ],
          },
        ],
      },
      {
        id: "betriebskosten",
        titel: "Instandhaltung ist keine Betriebskosten-Position",
        bloecke: [
          {
            typ: "text",
            text: "Laufende Kosten wie Hausmeister, Wartung oder Treppenhausreinigung dürfen als Betriebskosten umgelegt werden. Reparaturen und Erneuerungen gehören nicht dazu. In Hausmeister-Rechnungen müssen Reparaturanteile deshalb herausgerechnet werden.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Wer zahlt ein undichtes Fenster in der Eigentumswohnung?",
        antwort: "Meist die Gemeinschaft, weil Fenster in vielen Teilungserklärungen zum Gemeinschaftseigentum gehören. Manche Teilungserklärungen weisen die Kosten aber dem einzelnen Eigentümer zu.",
      },
      {
        frage: "Kann die Gemeinschaft Kosten anders verteilen?",
        antwort: "Ja. Seit der WEG-Reform 2020 kann die Gemeinschaft für einzelne Kosten oder bestimmte Arten von Kosten einen anderen Verteilerschlüssel beschließen.",
      },
    ],
    verwandt: ["sanierung-weg-vergleichsangebote", "wasserschaden-mehrfamilienhaus"],
    anfrage: { text: "teo erledigt Reparaturen am Gemeinschafts- und Sondereigentum und rechnet je Haus nachvollziehbar ab." },
  },
];

export function ratgeberArtikel(slug: string): RatgeberArtikel | undefined {
  return TEO_RATGEBER.find((a) => a.slug === slug);
}

export const RATGEBER_PFAD = "/ratgeber";
export const ratgeberPfad = (slug: string) => `${RATGEBER_PFAD}/${slug}`;
