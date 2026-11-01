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
    verwandt: ["rauchwarnmelder-bayern", "legionellenpruefung-trinkwasser", "aufzugspruefung"],
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
    verwandt: ["pruefpflichten-mehrfamilienhaus", "heizungswartung-mehrfamilienhaus"],
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
    verwandt: ["schimmel-feuchte-mietwohnung", "rueckstausicherung-keller", "instandhaltung-wer-zahlt"],
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
    verwandt: ["treppenhausreinigung-mehrfamilienhaus", "baumkontrolle-verkehrssicherung", "hausmeisterkosten-umlegen"],
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
    verwandt: ["sanierung-weg-vergleichsangebote", "hausmeisterkosten-umlegen"],
    anfrage: { text: "teo erledigt Reparaturen am Gemeinschafts- und Sondereigentum und rechnet je Haus nachvollziehbar ab." },
  },
  {
    slug: "hausmeisterkosten-umlegen",
    kategorie: "Betrieb & Pflichten",
    titel: "Hausmeisterkosten umlegen: was erlaubt ist und was nicht",
    metaTitel: "Hausmeisterkosten umlegen: Was ist umlagefähig?",
    beschreibung:
      "Welche Hausmeisterkosten Vermieter als Betriebskosten abrechnen dürfen, welche Anteile herausgerechnet werden müssen und wie die Abrechnung prüfsicher wird.",
    kurzantwort:
      "Hausmeisterkosten sind als Betriebskosten umlagefähig, soweit sie für laufende Tätigkeiten anfallen: Kontrollgänge, Pflege der Außenanlagen, Treppenhaus, Winterdienst, Bedienung der Technik (§ 2 Nr. 14 Betriebskostenverordnung). Nicht umlegbar sind Reparaturen, Erneuerungen und Verwaltungsarbeiten. Diese Anteile müssen aus der Rechnung herausgerechnet werden.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "abgrenzung",
        titel: "Was umlagefähig ist und was nicht",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Tätigkeit", "Umlagefähig"],
            zeilen: [
              ["Kontrollgänge, Haustechnik überwachen", "ja"],
              ["Treppenhaus, Außenanlagen, Mülltonnen", "ja, wenn nicht schon gesondert abgerechnet"],
              ["Winterdienst", "ja, wenn nicht schon gesondert abgerechnet"],
              ["Kleine Reparaturen, Austausch von Teilen", "nein, Instandhaltung"],
              ["Handwerker beauftragen, Wohnungsübergaben, Schriftverkehr", "nein, Verwaltung"],
              ["Notdienst-Bereitschaft für Reparaturen", "in der Regel nein"],
            ],
          },
        ],
      },
      {
        id: "doppelt",
        titel: "Keine doppelte Abrechnung",
        bloecke: [
          {
            typ: "text",
            text: "Wird die Treppenhausreinigung, die Gartenpflege oder der Winterdienst bereits als eigene Position abgerechnet, darf dieselbe Leistung nicht noch einmal in den Hausmeisterkosten stecken. Gerichte achten darauf besonders.",
          },
        ],
      },
      {
        id: "nachweis",
        titel: "So wird die Abrechnung prüfsicher",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Leistungsverzeichnis", text: "Im Vertrag mit Hausmeister oder Dienstleister die Tätigkeiten einzeln aufführen." },
              { titel: "Anteile trennen", text: "Für Reparatur- und Verwaltungsanteile einen nachvollziehbaren Prozentsatz oder Stundennachweis festlegen." },
              { titel: "Tätigkeiten belegen", text: "Kontrollgänge und Einsätze mit Datum festhalten, etwa als Rundgangsprotokoll." },
              { titel: "Wirtschaftlich bleiben", text: "Kosten müssen angemessen sein (§ 556 Abs. 3 BGB). Vergleichsangebote helfen beim Nachweis." },
            ],
          },
          {
            typ: "hinweis",
            text: "Bestreitet ein Mieter die Aufteilung, muss der Vermieter darlegen, wie sich die Kosten zusammensetzen. Ohne Nachweis droht, dass ein Teil nicht anerkannt wird.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Darf der Hausmeister auch Reparaturen machen?",
        antwort: "Ja, nur dürfen diese Kosten nicht als Betriebskosten auf Mieter umgelegt werden. Sie gehören zur Instandhaltung, die der Eigentümer trägt.",
      },
      {
        frage: "Müssen Mieter die Hausmeisterkosten zahlen, wenn der Mietvertrag nichts dazu sagt?",
        antwort: "Nein. Betriebskosten dürfen nur umgelegt werden, wenn der Mietvertrag das vereinbart. Ein Verweis auf die Betriebskostenverordnung genügt in der Regel.",
      },
    ],
    verwandt: ["treppenhausreinigung-mehrfamilienhaus", "instandhaltung-wer-zahlt", "winterdienst-muenchen"],
    anfrage: { text: "teo stellt Hausmeister und Reinigung mit klarem Leistungsverzeichnis und Rundgangsprotokoll im Portal.", situation: "hausmeister" },
  },
  {
    slug: "aufzugspruefung",
    kategorie: "Wartung & Prüfung",
    titel: "Aufzugsprüfung im Wohnhaus: Fristen, Notruf, Kosten",
    metaTitel: "Aufzugsprüfung: Fristen, Notruf und Kosten",
    beschreibung:
      "Wie oft ein Aufzug im Wohnhaus geprüft werden muss, was Betreiber beim Notruf beachten müssen und welche Aufzugskosten Mieter zahlen.",
    kurzantwort:
      "Aufzüge in Wohnhäusern sind überwachungsbedürftige Anlagen. Spätestens alle zwei Jahre ist eine Hauptprüfung durch eine zugelassene Überwachungsstelle fällig, in der Mitte dazwischen eine Zwischenprüfung (Betriebssicherheitsverordnung). Der Aufzug braucht einen Notruf, der jederzeit eine besetzte Stelle erreicht. Prüf- und Wartungskosten sind umlagefähig, Reparaturen nicht.",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "fristen",
        titel: "Welche Prüfungen fällig sind",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Prüfung", "Wann", "Wer"],
            zeilen: [
              ["Prüfung vor Inbetriebnahme", "vor dem ersten Betrieb und nach wesentlichen Änderungen", "zugelassene Überwachungsstelle"],
              ["Hauptprüfung", "spätestens alle 2 Jahre", "zugelassene Überwachungsstelle (z. B. TÜV, DEKRA)"],
              ["Zwischenprüfung", "in der Mitte zwischen zwei Hauptprüfungen", "zugelassene Überwachungsstelle"],
              ["Wartung", "nach Herstellerangabe, meist mehrmals jährlich", "Aufzugsfirma"],
            ],
          },
          {
            typ: "text",
            text: "Die Prüfplakette im Fahrkorb zeigt, wann die nächste Prüfung fällig ist. Stellt die Prüfstelle gefährliche Mängel fest, darf der Aufzug bis zur Behebung nicht weiter betrieben werden.",
          },
        ],
      },
      {
        id: "notruf",
        titel: "Notruf",
        bloecke: [
          {
            typ: "text",
            text: "Eingeschlossene Personen müssen jederzeit Hilfe rufen können. Dafür braucht der Aufzug ein Zwei-Wege-Kommunikationssystem, das eine ständig besetzte Stelle erreicht, und einen Notfallplan, wer im Fall der Fälle befreit. Viele Häuser haben noch alte Telefonleitungen, die nach der Umstellung auf IP-Telefonie nicht mehr zuverlässig funktionieren. Das sollte bei der nächsten Wartung geprüft werden.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Welche Kosten Mieter tragen",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Umlagefähig (§ 2 Nr. 7 Betriebskostenverordnung): Betriebsstrom, Beaufsichtigung, Pflege, regelmäßige Prüfung, Reinigung, Notrufbereitschaft",
              "Nicht umlagefähig: Reparaturen und Ersatzteile",
              "Bei einem Vollwartungsvertrag muss der Reparaturanteil herausgerechnet werden",
            ],
          },
          {
            typ: "text",
            text: "Mieter im Erdgeschoss können an den Aufzugskosten beteiligt werden, wenn der Mietvertrag das vorsieht und kein abweichender Schlüssel vereinbart ist.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Wer ist Betreiber des Aufzugs?",
        antwort: "Der Eigentümer, in der WEG die Gemeinschaft, vertreten durch die Verwaltung. Der Betreiber muss Prüfungen beauftragen und den sicheren Betrieb gewährleisten.",
      },
      {
        frage: "Was kostet es, wenn die Prüfung versäumt wird?",
        antwort: "Ein Betrieb ohne gültige Prüfung ist eine Ordnungswidrigkeit. Bei einem Unfall drohen zudem Haftung und Probleme mit der Versicherung.",
      },
    ],
    verwandt: ["pruefpflichten-mehrfamilienhaus", "hausmeisterkosten-umlegen"],
    anfrage: { text: "teo behält die Aufzugsfristen im Blick, beauftragt Prüfstelle und Wartung und kümmert sich um Mängel.", situation: "pruefungen" },
  },
  {
    slug: "rueckstausicherung-keller",
    kategorie: "Wartung & Prüfung",
    titel: "Rückstausicherung im Keller: Pflicht, Wartung, Versicherung",
    metaTitel: "Rückstausicherung: Pflicht, Wartung, Versicherung",
    beschreibung:
      "Warum Kellerabläufe gegen Rückstau aus dem Kanal gesichert sein müssen, wie oft Rückstauverschluss und Hebeanlage gewartet werden und was die Versicherung erwartet.",
    kurzantwort:
      "Alle Abläufe unterhalb der Rückstauebene, meist der Straßenoberkante, müssen gegen Rückstau aus dem Kanal gesichert sein. Das verlangen die Entwässerungssatzungen der Gemeinden. Rückstauverschlüsse sollten monatlich vom Betreiber betätigt und halbjährlich von einem Fachkundigen gewartet werden (DIN 1986-100). Fehlt die Sicherung oder ist sie nicht gewartet, zahlt die Versicherung oft nicht.",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "warum",
        titel: "Warum Rückstau gefährlich ist",
        bloecke: [
          {
            typ: "text",
            text: "Bei Starkregen kann der öffentliche Kanal so voll laufen, dass Abwasser durch Bodenabläufe, Waschbecken oder Toiletten im Keller nach oben drückt. Für Schäden durch fehlende Sicherung haftet in der Regel nicht die Stadt, sondern der Eigentümer selbst.",
          },
        ],
      },
      {
        id: "loesungen",
        titel: "Welche Sicherung passt",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Lösung", "Geeignet für"],
            zeilen: [
              ["Rückstauverschluss (Klappe)", "selten genutzte Abläufe, z. B. Bodenablauf ohne Toilette"],
              ["Rückstauverschluss für fäkalienhaltiges Abwasser", "WC im Keller, mit Motor und Warnung"],
              ["Hebeanlage", "genutzte Räume im Keller, Wohnungen im Souterrain"],
            ],
          },
        ],
      },
      {
        id: "wartung",
        titel: "Wartung und Kontrolle",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Anlage", "Betreiber", "Fachkundiger"],
            zeilen: [
              ["Rückstauverschluss", "monatlich betätigen", "halbjährlich warten"],
              ["Hebeanlage im Mehrfamilienhaus", "regelmäßig Sichtkontrolle", "halbjährlich warten"],
            ],
          },
          {
            typ: "hinweis",
            text: "Viele Versicherungen verlangen eine funktionsfähige, gewartete Rückstausicherung. Wartungsprotokolle aufbewahren.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Wo liegt die Rückstauebene?",
        antwort: "In der Regel auf Höhe der Straßenoberkante an der Anschlussstelle. Die genaue Festlegung steht in der Entwässerungssatzung der Gemeinde.",
      },
      {
        frage: "Darf der Rückstauverschluss dauerhaft geschlossen bleiben?",
        antwort: "Nur bei Abläufen, die nicht genutzt werden. Ist der Verschluss geschlossen, kann im Keller kein Wasser mehr ablaufen; ein Rohrbruch im Haus führt dann zu Wasser im Keller.",
      },
    ],
    verwandt: ["wasserschaden-mehrfamilienhaus", "pruefpflichten-mehrfamilienhaus"],
    anfrage: { text: "teo prüft die Rückstausicherung, übernimmt die halbjährliche Wartung und rüstet bei Bedarf nach.", situation: "pruefungen" },
  },
  {
    slug: "schimmel-feuchte-mietwohnung",
    kategorie: "Schaden & Versicherung",
    titel: "Schimmel und Feuchte in der Mietwohnung: Ursache klären, richtig handeln",
    metaTitel: "Schimmel in der Mietwohnung: Ursache und Vorgehen",
    beschreibung:
      "Wie Verwaltung und Vermieter bei Schimmelmeldungen vorgehen: Ursache feststellen, Bausubstanz oder Lüftung, Sanierung, Mietminderung.",
    kurzantwort:
      "Bei Schimmel zuerst die Ursache klären: Feuchte von außen oder aus Leitungen ist ein Baumangel, zu wenig Lüften oder Heizen liegt beim Bewohner. Dafür Feuchte messen und den Bauzustand prüfen lassen. Liegt ein Baumangel vor, muss der Vermieter sanieren und die Miete kann gemindert werden. Kleine Flächen unter etwa einem halben Quadratmeter lassen sich oft ohne Fachfirma entfernen, wenn die Ursache behoben ist.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "ursachen",
        titel: "Typische Ursachen",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Ursache", "Anzeichen"],
            zeilen: [
              ["Undichtes Dach, Fassade oder Leitung", "Feuchte auch bei guter Lüftung, Flecken wachsen von außen nach innen"],
              ["Wärmebrücke", "Schimmel in Außenecken, an Fensterlaibungen, hinter Schränken an Außenwänden"],
              ["Aufsteigende Feuchte", "Erdgeschoss oder Keller, Salzränder am Putz"],
              ["Zu wenig Lüften oder Heizen", "Kondenswasser an Fenstern, hohe Luftfeuchte in Bad und Schlafzimmer"],
            ],
          },
        ],
      },
      {
        id: "vorgehen",
        titel: "So gehen Sie vor",
        bloecke: [
          {
            typ: "schritte",
            punkte: [
              { titel: "Meldung aufnehmen", text: "Fotos, betroffene Räume, seit wann, wie gelüftet und geheizt wird." },
              { titel: "Ursache prüfen", text: "Feuchtemessung an der Wand, Raumklima, Begutachtung von Fassade, Dach und Leitungen." },
              { titel: "Ursache beheben", text: "Undichtigkeit reparieren oder Wärmebrücke beseitigen. Ohne diesen Schritt kommt der Schimmel zurück." },
              { titel: "Sanieren", text: "Befallene Bauteile reinigen oder austauschen, bei größeren Flächen durch eine Fachfirma." },
            ],
          },
          {
            typ: "hinweis",
            text: "Als Richtwert gilt eine relative Luftfeuchte von 40 bis 60 Prozent. Dauerhaft höhere Werte begünstigen Schimmel.",
          },
        ],
      },
      {
        id: "miete",
        titel: "Mietrecht: wer muss was beweisen",
        bloecke: [
          {
            typ: "text",
            text: "Zunächst muss der Vermieter darlegen, dass die Ursache nicht in der Bausubstanz liegt. Gelingt das, muss der Mieter zeigen, dass er ausreichend gelüftet und geheizt hat. Ein Gutachten schafft hier am schnellsten Klarheit. Liegt die Ursache beim Gebäude, kann der Mieter die Miete angemessen mindern, solange der Mangel besteht.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Darf der Vermieter bestimmte Lüftungszeiten vorschreiben?",
        antwort: "Verlangt werden darf ein übliches Lüften und Heizen. Übertriebene Vorgaben, etwa mehrmals stündlich zu lüften, sind nicht zumutbar.",
      },
      {
        frage: "Zahlt die Versicherung Schimmel?",
        antwort: "Schimmel als Folge eines versicherten Leitungswasserschadens ist oft mitversichert. Schimmel durch Baumängel oder falsches Lüften in der Regel nicht.",
      },
    ],
    verwandt: ["wasserschaden-mehrfamilienhaus", "instandhaltung-wer-zahlt"],
    anfrage: { text: "teo misst Feuchte, klärt die Ursache und saniert, mit Fotos und Bericht für Verwaltung und Mieter.", situation: "wasser" },
  },
  {
    slug: "treppenhausreinigung-mehrfamilienhaus",
    kategorie: "Betrieb & Pflichten",
    titel: "Treppenhausreinigung im Mehrfamilienhaus: Pflicht, Umfang, Kosten",
    metaTitel: "Treppenhausreinigung: Pflicht, Umfang und Kosten",
    beschreibung:
      "Wer das Treppenhaus reinigen muss, wann Mieter dazu verpflichtet sind, was zu einer ordentlichen Reinigung gehört und wie die Kosten umgelegt werden.",
    kurzantwort:
      "Für die Reinigung von Treppenhaus und Gemeinschaftsflächen ist der Eigentümer verantwortlich. Er kann sie per Mietvertrag auf die Mieter übertragen, etwa im Wechsel, oder einen Reinigungsdienst beauftragen. Die Kosten eines Dienstleisters sind als Betriebskosten umlagefähig (§ 2 Nr. 9 Betriebskostenverordnung). Üblich ist eine wöchentliche Reinigung.",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "umfang",
        titel: "Was zur Reinigung gehört",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Bereich", "Üblicher Rhythmus"],
            zeilen: [
              ["Treppen, Podeste, Eingangsbereich kehren und wischen", "wöchentlich"],
              ["Handläufe, Türen, Briefkästen, Lichtschalter", "wöchentlich"],
              ["Kellergänge, Fahrradraum, Waschküche", "monatlich"],
              ["Treppenhausfenster", "mehrmals im Jahr"],
              ["Spinnweben, Heizkörper, Leuchten", "mehrmals im Jahr"],
            ],
          },
        ],
      },
      {
        id: "mieter",
        titel: "Reinigung durch die Mieter",
        bloecke: [
          {
            typ: "text",
            text: "Die Pflicht kann auf Mieter übertragen werden, wenn der Mietvertrag das vorsieht. Eine Hausordnung, die Teil des Mietvertrags ist, genügt. Klappt die Reinigung im Wechsel nicht, kann der Vermieter nach Abmahnung einen Dienstleister beauftragen; ob die Kosten dann umgelegt werden dürfen, hängt vom Vertrag ab.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Kosten",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Umlagefähig: laufende Reinigung der gemeinsam genutzten Flächen",
              "Nicht umlagefähig: Sonderreinigung nach Bau- oder Handwerkerarbeiten, Beseitigung von Graffiti",
              "Keine doppelte Abrechnung mit den Hausmeisterkosten",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Darf ein älterer Mieter von der Reinigung befreit werden?",
        antwort: "Eine Befreiung ist möglich, wenn alle Beteiligten zustimmen oder der Vermieter einen Ausgleich regelt. Einen allgemeinen Anspruch gibt es nicht; der Mieter kann aber eine Hilfe oder einen Dienstleister auf eigene Kosten beauftragen.",
      },
      {
        frage: "Wie oft muss gereinigt werden?",
        antwort: "Gesetzlich ist das nicht festgelegt. Wöchentlich gilt als üblich und angemessen, bei großen Häusern auch häufiger.",
      },
    ],
    verwandt: ["hausmeisterkosten-umlegen", "winterdienst-muenchen"],
    anfrage: { text: "teo übernimmt die Treppenhausreinigung mit festem Plan und Nachweis je Reinigung im Portal.", situation: "hausmeister" },
  },
  {
    slug: "heizungswartung-mehrfamilienhaus",
    kategorie: "Wartung & Prüfung",
    titel: "Heizungswartung im Mehrfamilienhaus: Pflichten nach GEG und Schornsteinfeger",
    metaTitel: "Heizungswartung Mehrfamilienhaus: GEG und Pflichten",
    beschreibung:
      "Welche Prüfungen und Wartungen für die Zentralheizung im Mehrfamilienhaus anfallen: Schornsteinfeger, Heizungsprüfung nach GEG, Wartung und Kosten.",
    kurzantwort:
      "Für die Zentralheizung im Mehrfamilienhaus sind die Termine des Schornsteinfegers laut Feuerstättenbescheid Pflicht. Das Gebäudeenergiegesetz verlangt für viele Gas- und Ölheizungen in Häusern ab sechs Wohnungen außerdem eine Heizungsprüfung und Optimierung (§ 60b GEG); die Frist hängt vom Einbaujahr ab. Eine jährliche Wartung durch einen Fachbetrieb ist üblich und hält Herstellergarantien aufrecht. Die Wartungskosten sind umlagefähig.",
    lesezeitMin: 5,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "pflichten",
        titel: "Was Pflicht ist",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Was", "Wann", "Grundlage"],
            zeilen: [
              ["Kehren, Messen, Überprüfen durch den Schornsteinfeger", "laut Feuerstättenbescheid", "Schornsteinfeger-Handwerksgesetz, 1. BImSchV"],
              ["Feuerstättenschau", "zweimal in sieben Jahren", "Schornsteinfeger-Handwerksgesetz"],
              ["Heizungsprüfung und -optimierung", "bei Gas- und Ölheizungen in Häusern ab 6 Wohnungen, Frist nach Einbaujahr", "§ 60b GEG"],
              ["Hydraulischer Abgleich", "in bestimmten Fällen bei Häusern ab 6 Wohnungen", "§ 60c GEG"],
            ],
          },
          {
            typ: "hinweis",
            text: "Die GEG-Pflichten haben Ausnahmen und Übergangsfristen. Welche für Ihre Anlage gilt, klärt der Heizungsfachbetrieb bei der nächsten Wartung.",
          },
        ],
      },
      {
        id: "wartung",
        titel: "Was eine Wartung umfasst",
        bloecke: [
          {
            typ: "liste",
            punkte: [
              "Brenner und Wärmetauscher reinigen",
              "Einstellungen und Abgaswerte prüfen",
              "Sicherheitseinrichtungen und Ausdehnungsgefäß prüfen",
              "Heizkurve und Zirkulation an den Bedarf anpassen",
              "Protokoll für Gewährleistung und Versicherung",
            ],
          },
          {
            typ: "text",
            text: "Am besten im Sommer warten lassen. Dann sind Termine leichter zu bekommen und ein Ausfall trifft niemanden.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Kosten",
        bloecke: [
          {
            typ: "text",
            text: "Wartung, Reinigung und Prüfung der Betriebssicherheit sowie die Kosten des Schornsteinfegers sind Teil der Heizkosten und umlagefähig. Reparaturen und der Austausch von Teilen trägt der Eigentümer.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Ist eine jährliche Heizungswartung gesetzlich vorgeschrieben?",
        antwort: "Eine allgemeine gesetzliche Pflicht zur jährlichen Wartung gibt es nicht. Hersteller verlangen sie aber meist für die Garantie, und sie senkt Ausfälle im Winter deutlich.",
      },
      {
        frage: "Was tun, wenn die Heizung im Winter ausfällt?",
        antwort: "Sofort einen Heizungsbetrieb beauftragen. Bei Ausfall im Winter ist das ein dringender Fall, den die Verwaltung auch ohne Beschluss beauftragen darf.",
      },
    ],
    verwandt: ["pruefpflichten-mehrfamilienhaus", "instandhaltung-wer-zahlt"],
    anfrage: { text: "teo plant Wartung und Schornsteinfeger-Termine, kümmert sich um die GEG-Prüfung und ist bei Ausfall schnell da.", situation: "heizung" },
  },
  {
    slug: "baumkontrolle-verkehrssicherung",
    kategorie: "Betrieb & Pflichten",
    titel: "Bäume auf dem Grundstück: Kontrolle, Fällung, Haftung",
    metaTitel: "Baumkontrolle und Verkehrssicherung: Pflichten",
    beschreibung:
      "Wie oft Eigentümer Bäume kontrollieren müssen, wann in München eine Fällgenehmigung nötig ist, welche Schnittzeiten gelten und wer bei Schäden haftet.",
    kurzantwort:
      "Eigentümer müssen Bäume auf ihrem Grundstück regelmäßig auf Schäden kontrollieren lassen, üblich ist eine Sichtkontrolle ein- bis zweimal im Jahr, belaubt und unbelaubt. In München braucht das Fällen vieler Bäume eine Genehmigung nach der Baumschutzverordnung. Starke Rückschnitte und Fällungen sind vom 1. März bis 30. September grundsätzlich verboten (§ 39 Bundesnaturschutzgesetz).",
    lesezeitMin: 4,
    aktualisiert: "2026-11-01",
    abschnitte: [
      {
        id: "kontrolle",
        titel: "Regelmäßige Kontrolle",
        bloecke: [
          {
            typ: "text",
            text: "Fällt ein Ast auf ein Auto oder einen Passanten, prüfen Gerichte, ob der Baum ordentlich kontrolliert wurde. Üblich ist eine Sichtkontrolle vom Boden aus durch eine sachkundige Person, angelehnt an die Baumkontrollrichtlinie der FLL. Bei Auffälligkeiten folgt eine eingehende Untersuchung.",
          },
          {
            typ: "liste",
            punkte: [
              "Totholz und abgebrochene Äste",
              "Pilzbefall an Stamm und Wurzeln",
              "Risse, Höhlen, Schieflage",
              "Anhebung des Bodens im Wurzelbereich",
            ],
          },
        ],
      },
      {
        id: "faellung",
        titel: "Fällen und Schneiden in München",
        bloecke: [
          {
            typ: "tabelle",
            kopf: ["Thema", "Regel"],
            zeilen: [
              ["Fällgenehmigung", "für geschützte Bäume nach der Münchner Baumschutzverordnung, vor allem ab einem Stammumfang von 80 cm in 1 m Höhe"],
              ["Schnittzeiten", "1. März bis 30. September keine Fällung und keine starken Rückschnitte; schonende Pflegeschnitte erlaubt"],
              ["Gefahr im Verzug", "akute Gefahr darf sofort beseitigt werden, danach der Behörde melden und dokumentieren"],
            ],
          },
          {
            typ: "hinweis",
            text: "Vor jeder Fällung bei der Unteren Naturschutzbehörde der Stadt nachfragen. Ungenehmigte Fällungen können Bußgelder und Ersatzpflanzungen nach sich ziehen.",
          },
        ],
      },
      {
        id: "kosten",
        titel: "Kosten",
        bloecke: [
          {
            typ: "text",
            text: "Laufende Baumpflege gehört zur Gartenpflege und ist umlagefähig (§ 2 Nr. 10 Betriebskostenverordnung). Ob die Kosten einer Fällung umgelegt werden dürfen, ist umstritten und hängt vom Einzelfall ab.",
          },
        ],
      },
    ],
    faq: [
      {
        frage: "Wer haftet, wenn ein Baum bei Sturm umstürzt?",
        antwort: "Bei einem gesunden, regelmäßig kontrollierten Baum gilt ein Sturmschaden meist als höhere Gewalt. Haftung droht, wenn Schäden erkennbar waren und nicht gehandelt wurde.",
      },
      {
        frage: "Wer kontrolliert die Bäume in der WEG?",
        antwort: "Die Verwaltung beauftragt die Kontrolle für die Gemeinschaft. Die Protokolle sollten aufbewahrt werden, sie sind im Schadensfall der wichtigste Nachweis.",
      },
    ],
    verwandt: ["winterdienst-muenchen", "pruefpflichten-mehrfamilienhaus"],
    anfrage: { text: "teo lässt Ihre Bäume kontrollieren, klärt Genehmigungen und organisiert Pflege und Fällung." },
  },
];

export function ratgeberArtikel(slug: string): RatgeberArtikel | undefined {
  return TEO_RATGEBER.find((a) => a.slug === slug);
}

export const RATGEBER_PFAD = "/ratgeber";
export const ratgeberPfad = (slug: string) => `${RATGEBER_PFAD}/${slug}`;
