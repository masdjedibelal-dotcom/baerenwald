import type { RatgeberData } from "@/lib/ratgeber/types";
import {
  BESTE_GU_SEO,
  GU_VS_EINZEL_SEO,
  HANDWERKER_FINDEN_SEO,
  KOMPLETTSANIERUNG_ABLAUF_SEO,
  NOTFALL_HANDWERKER_SEO,
  RENOVIERUNG_CHECKLISTE_SEO,
} from "@/lib/ratgeber/articles/guide-seo-content";

const DATES_GUIDE = {
  datePublished: "2026-01-15",
  dateModified: "2026-05-19",
} as const;

const GUIDE_SHELL = {
  layout: "guide" as const,
  wannBrauche: { title: "", punkte: [] as string[] },
  voraussetzungen: [] as string[],
  materialien: [] as RatgeberData["materialien"],
  kosten: {
    einheit: "",
    von: 0,
    bis: 0,
    faktoren: [] as string[],
    beispiel: "",
  },
  zeitaufwand: {
    klein: "",
    mittel: "",
    gross: "",
    faktoren: [] as string[],
  },
  qualitaet: [] as string[],
  muenchen: [] as string[],
  koordination:
    "Bärenwald München koordiniert alle Gewerke — ein Ansprechpartner, eine Rechnung, Festpreis nach Vor-Ort-Termin.",
  koordinationUsps: [
    "Ein Projektleiter für alle Handwerker",
    "Festpreis nach detailliertem Ausmessen vor Ort",
    "Reklamation & Nachbesserung zentral",
  ] as [string, string, string],
  ...DATES_GUIDE,
};

export const generalunternehmerVsEinzelhandwerkerMuenchen: RatgeberData = {
  slug: "generalunternehmer-vs-einzelhandwerker-muenchen",
  titel: "Generalunternehmer vs. Einzelhandwerker",
  ...GU_VS_EINZEL_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline:
      "Generalunternehmer oder einzelner Handwerker — was ist besser für mein Projekt?",
    subline:
      "Entscheidungshilfe für München: wann ein Gewerk reicht — und wann sich Koordination aus einer Hand lohnt.",
  },
  ablauf: [
    {
      schritt: "Wann reicht ein einzelner Handwerker?",
      text: "Für klar abgegrenzte Einzelleistungen ohne Abhängigkeiten zu anderen Gewerken. Beispiele: nur streichen, nur Boden verlegen, nur eine Armatur tauschen. Hier ist ein Einzelhandwerker günstiger, weil kein Koordinationsaufwand anfällt.",
    },
    {
      schritt: "Wann lohnt sich ein Generalunternehmer?",
      text: "Sobald mindestens zwei Gewerke aufeinander folgen oder voneinander abhängen. Klassischer Fall: Badsanierung braucht Sanitär, Elektro, Fliesen und oft Trockenbau — alle müssen in der richtigen Reihenfolge kommen. Oder: Wohnungsrenovierung mit Boden, Maler und neuem Bad gleichzeitig.",
    },
    {
      schritt: "Was kostet ein Generalunternehmer mehr als Einzelhandwerker?",
      text: "Die Koordinationspauschale liegt typischerweise bei 10–15 % des Projektvolumens. Dafür entfällt der eigene Zeitaufwand für Angebotseinholung, Terminabstimmung, Nachverfolgung und Reklamation — der bei komplexen Projekten schnell 40–60 Stunden beträgt.",
    },
    {
      schritt: "Was ist der Unterschied zu Plattformen wie MyHammer oder Blauarbeit?",
      text: "Auf Plattformen stellst du eine Anfrage und vergleichst Angebote verschiedener Handwerker — du koordinierst danach selbst. Ein Generalunternehmer übernimmt Koordination, Haftung und Projektführung komplett. Du hast eine Rechnung, einen Ansprechpartner und einen Festpreis.",
    },
    {
      schritt: "Für welche Projekte in München nutzen Kunden Bärenwald?",
      text: "Komplettsanierungen von Wohnungen, Badsanierungen mit mehreren Gewerken, Gartengestaltung mit Terrasse und Elektro, Notfalleinsätze, wo schnell mehrere Betriebe koordiniert werden müssen, und laufende Objektbetreuung für Hausverwaltungen.",
    },
  ],
  faq: [
    {
      q: "Kann ich bei Bärenwald auch nur ein Gewerk beauftragen?",
      a: "Ja — wir machen auch Einzelleistungen wie Malerarbeiten, Gartenpflege oder Hausmeisterservice. Der Vorteil: wenn später weitere Gewerke dazukommen, kennen wir das Objekt bereits.",
    },
    {
      q: "Gibt es einen Festpreis beim Generalunternehmer?",
      a: "Bei Bärenwald ja — nach dem Vor-Ort-Termin gibt es ein verbindliches Festpreisangebot. Kein Nachtrag ohne deine ausdrückliche Zustimmung.",
    },
    {
      q: "Wer haftet wenn etwas schiefgeht?",
      a: "Bärenwald als Generalunternehmer — nicht der einzelne Handwerker. Du musst nicht herausfinden, welcher Betrieb für einen Schaden verantwortlich ist.",
    },
    {
      q: "Wie schnell kann ein Projekt starten?",
      a: "Nach Auftragsbestätigung planen wir den Start innerhalb von 1–3 Wochen — je nach Umfang und Auslastung.",
    },
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Badezimmer sanieren in München",
  rechnerSituation: "erneuern",
  ctaRechnerLabel: "Preisrahmen für dein Projekt berechnen →",
};

export const besteGeneralunternehmerMuenchen: RatgeberData = {
  slug: "beste-generalunternehmer-muenchen",
  titel: "Beste Generalunternehmer München",
  ...BESTE_GU_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline:
      "Generalunternehmer in München — worauf du bei der Auswahl achten solltest",
    subline:
      "Kriterien, Vergleich und woran du seriöse Anbieter von Vermittlern unterscheidest.",
  },
  ablauf: [
    {
      schritt: "Woran erkenne ich einen seriösen Generalunternehmer in München?",
      text: "Vier Merkmale sind entscheidend: erstens ein schriftliches Festpreisangebot nach Besichtigung (kein Angebot per Telefon), zweitens nachweisbare Meisterbetriebe im Netzwerk (keine anonymen Subunternehmer), drittens klare Kommunikation über Zeitplan und Ablauf, viertens Dokumentation bei Abnahme. Wer diese vier Punkte nicht erfüllt, ist kein vollwertiger Generalunternehmer.",
    },
    {
      schritt: "Was kostet ein Generalunternehmer in München?",
      text: "Die Koordinationspauschale liegt typischerweise bei 10–15 % des Projektvolumens. Für eine Badsanierung von 15.000 Euro macht das 1.500–2.250 Euro Koordinationskosten — dafür entfällt der gesamte eigene Aufwand für Angebotseinholung, Terminabstimmung und Reklamation.",
    },
    {
      schritt: "Was unterscheidet Bärenwald von anderen Generalunternehmern in München?",
      text: "Bärenwald ist der einzige Generalunternehmer in München mit einem öffentlichen Online-Preisrechner für eine erste unverbindliche Kostenschätzung. Zusätzlich hat Bärenwald eigene Teams für Gartenbau, Hausmeisterservice und Reinigung — diese Gewerke werden nicht fremd vergeben. Für alle anderen Gewerke gibt es ein festes Netzwerk geprüfter Münchner Meisterbetriebe.",
    },
    {
      schritt: "Wie vergleiche ich Angebote von Generalunternehmern?",
      text: "Achte darauf, dass alle Angebote die gleichen Leistungen enthalten — was ist im Preis, was nicht? Entsorgung von Bauschutt, Koordinationspauschale und Materialkosten müssen transparent ausgewiesen sein. Hole mindestens zwei Angebote ein und frage explizit nach: Wer führt die Arbeiten aus? Gibt es Meisterbetriebe? Was passiert bei Mängeln?",
    },
    {
      schritt: "Für welche Projekte in München brauche ich einen Generalunternehmer?",
      text: "Immer dann, wenn mindestens zwei Gewerke aufeinander angewiesen sind: Badsanierung, Wohnungsrenovierung, Dachbodenausbau, Gartengestaltung mit Terrassenbau oder Notfalleinsätze, bei denen schnell mehrere Betriebe koordiniert werden müssen.",
    },
  ],
  faq: [
    {
      q: "Gibt es in München viele Generalunternehmer?",
      a: "Es gibt viele Firmen, die sich Generalunternehmer nennen, aber nur wenige, die wirklich alle Gewerke koordinieren und die Haftung übernehmen. Viele sind Vermittlungsplattformen ohne eigene Verantwortung.",
    },
    {
      q: "Muss ich als Auftraggeber selbst auf der Baustelle sein?",
      a: "Nein — das ist der Kernvorteil eines Generalunternehmers. Du wirst über Statusupdates informiert und nimmst am Ende ab. Die tägliche Koordination übernimmt Bärenwald.",
    },
    {
      q: "Was passiert wenn ein Handwerker ausfällt?",
      a: "Bärenwald koordiniert Ersatz aus dem Partnernetzwerk — du bemerkst es meist nicht. Das ist der Unterschied zu einem einzelnen Handwerker, der krank wird.",
    },
    {
      q: "Kann Bärenwald auch für Hausverwaltungen arbeiten?",
      a: "Ja — Bärenwald arbeitet für Privatpersonen, Eigentümer, Hausverwaltungen und Gewerbekunden. Für Hausverwaltungen gibt es individuelle Rahmenverträge.",
    },
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Badezimmer sanieren in München",
  rechnerSituation: "erneuern",
  ctaRechnerLabel: "Preisrahmen berechnen — unverbindlich →",
};

const CHECKLISTE_HANDWERKER = `1. Schriftlicher Kostenvoranschlag vor Beginn der Arbeiten
2. Meisterbrief oder Gesellenbrief nachweisbar
3. Betriebshaftpflichtversicherung vorhanden
4. Feste Erreichbarkeit (Telefon, nicht nur WhatsApp)
5. Vor-Ort-Termin vor dem Angebot (kein Telefon-Angebot)
6. Klare Aussage, wer die Arbeiten ausführt (eigene Mitarbeiter oder Subunternehmer)
7. Nachprüfbare Bewertungen auf Google, nicht nur auf der eigenen Website`;

export const zuverlaessigenHandwerkerFindenMuenchen: RatgeberData = {
  slug: "zuverlaessigen-handwerker-finden-muenchen",
  canonicalSlug: "zuverlässigen-handwerker-finden-muenchen",
  titel: "Zuverlässigen Handwerker finden München",
  ...HANDWERKER_FINDEN_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline: "Zuverlässigen Handwerker in München finden — so gehst du vor",
    subline:
      "Checkliste, typische Warnsignale und warum viele bei mehreren Gewerken auf einen Generalunternehmer umsteigen.",
  },
  ablauf: [
    {
      schritt: "Woran erkenne ich einen seriösen Handwerker in München?",
      text: CHECKLISTE_HANDWERKER,
    },
    {
      schritt: "Wo finde ich gute Handwerker in München?",
      text: "Die besten Wege sind persönliche Empfehlungen aus dem Bekanntenkreis, Google-Suche mit Bewertungen (mindestens 4,5 Sterne bei 20+ Bewertungen) und direkte Anfragen bei Meisterbetrieben. Vergleichsportale wie MyHammer liefern schnell Angebote, aber du koordinierst danach selbst. Für Projekte mit mehreren Gewerken ist ein Generalunternehmer wie Bärenwald München der einfachste Weg.",
    },
    {
      schritt: "Was sind typische Warnsignale bei Handwerkern in München?",
      text: "Sofortige Verfügbarkeit ohne Wartezeit, kein Vor-Ort-Termin vor dem Angebot, nur mündliche Preisangaben, Barzahlung als einzige Option, kein Impressum oder fehlende Gewerbeanmeldung, und Preise, die deutlich unter dem Marktüblichen liegen. In München kosten Malerarbeiten mindestens 12 €/m² — wer 5 €/m² anbietet, arbeitet schwarz oder mit minderwertigen Materialien.",
    },
    {
      schritt: "Wie lange muss ich in München auf einen Handwerker warten?",
      text: "Für einfache Reparaturen 1–3 Wochen, für größere Projekte 4–12 Wochen Vorlaufzeit. In den Sommermonaten (Juni–August) und vor Weihnachten sind die Wartezeiten am längsten. Wer jetzt plant, sollte mindestens 6 Wochen Vorlaufzeit einrechnen. Bärenwald München plant Projekte innerhalb von 1–3 Wochen nach Auftragsbestätigung.",
    },
    {
      schritt: "Warum steigen viele Münchner auf Generalunternehmer um?",
      text: "Weil die Koordination mehrerer Handwerker zeitaufwändig und nervenaufreibend ist. Wenn der Fliesenleger einen Tag zu spät kommt, kann der Sanitär nicht anfangen — solche Dominoeffekte kosten Zeit und Geld. Ein Generalunternehmer trägt diese Verantwortung und koordiniert intern.",
    },
  ],
  faq: [
    {
      q: "Wie viele Angebote sollte ich einholen?",
      a: "Mindestens zwei, besser drei — aber nur wenn alle Angebote auf der gleichen Leistungsbeschreibung basieren. Sonst vergleichst du Äpfel mit Birnen.",
    },
    {
      q: "Muss ich den günstigsten Handwerker nehmen?",
      a: "Nein. Der günstigste ist selten der beste. Wichtiger ist: Was ist im Preis enthalten? Gibt es Festpreis oder Stundensatz? Wer haftet bei Mängeln?",
    },
    {
      q: "Was tue ich wenn der Handwerker nicht fertig wird?",
      a: "Schriftlich eine Frist setzen (empfohlen: 14 Tage), danach Rücktritt vom Vertrag möglich. Deshalb immer schriftliche Verträge mit Fertigstellungstermin abschließen.",
    },
    {
      q: "Gibt es bei Bärenwald auch kurzfristige Termine?",
      a: "Für Notfälle (Heizung, Rohrbruch, Sturmschaden) koordinieren wir meist innerhalb von 24 Stunden. Für reguläre Projekte 1–3 Wochen nach Auftragsbestätigung.",
    },
  ],
  leistungsSlug: "malerarbeiten",
  leistungsLabel: "Malerarbeiten in München",
  rechnerSituation: "erneuern",
  ctaRechnerLabel:
    "Preisrahmen berechnen — ein Ansprechpartner für alle Gewerke →",
};

export const notfallHandwerkerMuenchen: RatgeberData = {
  slug: "notfall-handwerker-muenchen",
  titel: "Notfall Handwerker München",
  ...NOTFALL_HANDWERKER_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline:
      "Notfall-Handwerker in München — wer kommt schnell und was kostet das?",
    subline:
      "Heizung, Rohrbruch, Strom, Sturmschaden — was du sofort tun solltest und wie Bärenwald den passenden Fachbetrieb koordiniert.",
  },
  ablauf: [
    {
      schritt: "Was tun bei Heizungsausfall in München?",
      text: "Sofort prüfen: Thermostat, Sicherung, Gaszufuhr. Wenn nichts hilft: Notdienst anrufen. Bärenwald koordiniert Heizungs-Meisterbetriebe in München meist innerhalb von 2–4 Stunden. Kosten für Notdienst-Diagnose und einfache Reparatur: 300–800 Euro. Bei Totalausfall und nötigem Austausch: 8.000–35.000 Euro je nach Anlage.",
    },
    {
      schritt: "Was tun bei Rohrbruch oder Wasserschaden in München?",
      text: "Sofort Haupthahn zudrehen (meist im Keller oder unter der Spüle), Sicherungskasten prüfen, betroffenen Raum nicht betreten, wenn Wasser und Strom zusammenkommen. Dann Notdienst anrufen und Versicherung informieren. Bärenwald dokumentiert den Schaden für den Versicherungsfall. Kosten Notdienst: 400–1.500 Euro je nach Aufwand.",
    },
    {
      schritt: "Was tun bei Stromausfall in München?",
      text: "Zuerst Sicherungskasten prüfen — oft ist nur eine Sicherung rausgeflogen. Wenn alle Sicherungen in Ordnung sind und der Strom bleibt weg: Nachbar fragen ob Hausausfall, dann Stadtwerke München anrufen (bei Hausausfall). Bei Defekt in der eigenen Wohnung: Elektro-Notdienst. Bärenwald koordiniert Elektro-Meisterbetriebe für Notfälle.",
    },
    {
      schritt: "Was tun bei Sturmschaden am Dach in München?",
      text: "Wenn Ziegel fehlen oder der First beschädigt ist: provisorische Abdeckung mit Plane (Feuerwehr macht das bei akuter Gefahr), Versicherung informieren, Notdienst-Dachdecker beauftragen. Bärenwald koordiniert Dachdecker und Gerüstbauer auch kurzfristig. Wichtig: Schaden fotografieren, bevor er behoben wird — für die Versicherung.",
    },
    {
      schritt: "Was kostet ein Notdienst-Einsatz in München?",
      text: "Notdienst-Aufschläge in München sind je nach Uhrzeit 50–150 % des normalen Stundensatzes. Ein Einsatz abends oder am Wochenende kostet entsprechend mehr. Typische Kosten: Heizung 300–800 €, Rohrbruch 400–1.500 €, Elektro 200–600 €, Dach-Notreparatur 500–2.000 €. Bärenwald nennt vor dem Einsatz eine Kostenschätzung.",
    },
  ],
  faq: [
    {
      q: "Wie schnell ist Bärenwald im Notfall vor Ort?",
      a: "Wir koordinieren meist innerhalb von 2–4 Stunden einen Fachbetrieb — je nach Tageszeit und Verfügbarkeit. Bei akuter Gefahr (Gas, Wasser, Strom) immer zuerst 112 oder 110 anrufen.",
    },
    {
      q: "Wer zahlt bei einem Wasserschaden?",
      a: "Die Wohngebäudeversicherung oder Hausratversicherung — je nach Schadensursache. Bärenwald dokumentiert den Schaden mit Fotos und Bericht für den Versicherungsfall.",
    },
    {
      q: "Gibt es Notdienst auch nachts und am Wochenende?",
      a: "Ja — für akute Notfälle sind wir auch außerhalb der Geschäftszeiten erreichbar. Nacht- und Wochenendeinsätze haben einen Aufschlag.",
    },
    {
      q: "Was ist der Unterschied zu einem normalen Handwerker-Notdienst?",
      a: "Bärenwald koordiniert den passenden Fachbetrieb für dein spezifisches Problem — du musst nicht selbst herausfinden, welcher Handwerker für Heizung, Rohrbruch oder Elektro zuständig ist. Ein Anruf reicht.",
    },
  ],
  leistungsSlug: "heizung-sanitaer",
  leistungsLabel: "Heizung & Sanitär in München",
  rechnerSituation: "kaputt",
  ctaRechnerLabel: "Preisrahmen berechnen →",
  finalCtaPhoneFirst: true,
};

const REIHENFOLGE_RENOVIERUNG = `1. Abbruch und Entsorgung
2. Elektro-Rauputz (Leitungen legen)
3. Neue Wände / Trockenbau
4. Sanitär-Rauputz (Leitungen legen)
5. Estrich und Untergrund
6. Fliesen
7. Maler und Spachtel
8. Boden verlegen
9. Elektro-Feininstallation (Schalter, Steckdosen)
10. Sanitär-Feininstallation (Armaturen, WC)
Wer diese Reihenfolge nicht einhält, verliert Zeit und Geld.`;

export const renovierungMuenchenCheckliste: RatgeberData = {
  slug: "renovierung-muenchen-checkliste",
  titel: "Renovierung München Checkliste",
  ...RENOVIERUNG_CHECKLISTE_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline:
      "Renovierung in München planen — die 10 wichtigsten Punkte vor dem Start",
    subline:
      "Genehmigungen, Budget, Reihenfolge der Gewerke und Münchner Besonderheiten — bevor die Baustelle startet.",
  },
  ablauf: [
    {
      schritt: "Was muss ich vor einer Renovierung in München genehmigen lassen?",
      text: "Tragende Wände entfernen oder durchbrechen braucht einen Statiker und oft eine Baugenehmigung. Balkone, Dachgauben und Fassadenveränderungen ebenfalls. Reine Innenrenovierungen (Boden, Maler, Bad ohne Grundrissänderung) brauchen in der Regel keine Genehmigung — aber in Denkmalschutzobjekten gibt es Ausnahmen.",
    },
    {
      schritt: "Was muss ich als Mieter vor der Renovierung klären?",
      text: "Schriftliche Genehmigung des Vermieters für alle Arbeiten, die über normales Streichen hinausgehen. Besonders bei Bodenwechsel, Wanddurchbrüchen, Badumbau und neuen Elektroleitungen. In WEGs braucht der Eigentümer oft einen Beschluss der Eigentümerversammlung.",
    },
    {
      schritt: "Wie plane ich das Budget für eine Renovierung in München richtig?",
      text: "Grundregel: 15–20 % Puffer auf die Angebotssumme einrechnen — besonders im Altbau tauchen hinter Wänden oft ungeplante Probleme auf (alte Leitungen, Schimmel, Asbest). Finanzierung klären, bevor Aufträge vergeben werden. KfW-Kredite und BAFA-Förderung vor Beauftragung beantragen — nachträglich gibt es keine Förderung.",
    },
    {
      schritt: "In welcher Reihenfolge laufen Renovierungsarbeiten ab?",
      text: REIHENFOLGE_RENOVIERUNG,
    },
    {
      schritt: "Was ist bei Renovierungen in Münchner Altbauten besonders zu beachten?",
      text: "Altbauten in München (vor 1970) haben oft Besonderheiten: Asbestverdacht bei Böden und Putz (Baujahr vor 1993 prüfen lassen), alte Aluminiumleitungen, die ersetzt werden müssen, keine Wärmedämmung in den Wänden, und Deckenhöhen über 3 m, die Mehrkosten beim Trockenbau verursachen. Außerdem: Lieferfenster und Parkplätze in der Innenstadt frühzeitig abstimmen.",
    },
    {
      schritt: "Wann lohnt sich ein Generalunternehmer für meine Renovierung?",
      text: "Sobald mehr als ein Gewerk beteiligt ist und die Gewerke voneinander abhängen. Faustregel: wenn du mehr als 3 verschiedene Handwerker koordinieren müsstest, ist ein Generalunternehmer günstiger — weil du 30–60 Stunden eigenen Aufwand sparst und weniger Risiko bei Terminkollisionen trägst.",
    },
  ],
  faq: [
    {
      q: "Wie lange dauert eine komplette Wohnungsrenovierung in München?",
      a: "Eine 70 m² Wohnung mit Bad, Boden und Maler dauert 4–8 Wochen. Mit Küche, Elektro und neuen Wänden 8–14 Wochen. Altbau-Besonderheiten können die Dauer verlängern.",
    },
    {
      q: "Kann ich während der Renovierung in der Wohnung bleiben?",
      a: "Bei Teilrenovierungen (nur Boden oder nur Maler) oft ja. Bei Komplettsanierungen mit Bad und Küche meist nicht — wir beraten dich im Vorfeld ehrlich.",
    },
    {
      q: "Wer ist für Schäden an Nachbarwohnungen verantwortlich?",
      a: "Der Auftraggeber — also du als Eigentümer oder Mieter. Deshalb Bauherren-Haftpflichtversicherung für die Bauphase prüfen. Bärenwald koordiniert das auf Wunsch.",
    },
    {
      q: "Was kostet eine komplette Wohnungsrenovierung in München?",
      a: "200–800 Euro pro m² Wohnfläche je nach Umfang. Für 70 m² mit neuem Bad, Boden und Malerarbeiten: 15.000–40.000 Euro. Online Preisrahmen berechnen auf baerenwaldmuenchen.de/rechner.",
    },
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Wohnung renovieren in München",
  rechnerSituation: "erneuern",
  ctaRechnerLabel: "Preisrahmen berechnen →",
  finalCtaPhoneFirst: true,
};

const KOMPLETTSANIERUNG_SCHRITTE = `1. Bestandsaufnahme und Planung (1–2 Wochen)
2. Genehmigungen einholen falls nötig
3. Abbruch und Entsorgung (1–2 Wochen)
4. Elektro-Rauputz: neue Leitungen legen (1 Woche)
5. Sanitär-Rauputz: Wasser- und Abwasserleitungen (1 Woche)
6. Trockenbau: neue Wände, Vorwände, abgehängte Decken (1–2 Wochen)
7. Estrich gießen und trocknen lassen (2–4 Wochen Trocknungszeit)
8. Fliesen Bad und Küche (1–2 Wochen)
9. Malerarbeiten (1–2 Wochen)
10. Boden verlegen (1 Woche)
11. Elektro-Feininstallation: Schalter, Steckdosen, Leuchten (3–5 Tage)
12. Sanitär-Feininstallation: Armaturen, WC, Dusche (3–5 Tage)
13. Abnahme und Protokoll`;

export const komplettsanierungAblaufMuenchen: RatgeberData = {
  slug: "komplettsanierung-ablauf-muenchen",
  titel: "Komplettsanierung Ablauf München",
  ...KOMPLETTSANIERUNG_ABLAUF_SEO,
  ...GUIDE_SHELL,
  hero: {
    headline:
      "Komplettsanierung in München — wie läuft das ab und was kostet es?",
    subline:
      "Reihenfolge der Gewerke, Kostenrahmen, Zeitplan und warum ein Generalunternehmer den kritischen Pfad hält.",
  },
  ablauf: [
    {
      schritt: "Was ist der Unterschied zwischen Renovierung und Komplettsanierung?",
      text: "Renovierung erneuert Oberflächen (Farbe, Boden, Tapete). Komplettsanierung erneuert zusätzlich die Technik: Elektroleitungen, Wasserleitungen, Heizung, Bad komplett, oft auch Grundrissänderungen. In München werden besonders oft Altbauwohnungen komplett saniert — weil Leitungen aus den 60ern und 70ern nicht mehr zeitgemäß sind.",
    },
    {
      schritt: "Wie läuft eine Komplettsanierung in München Schritt für Schritt ab?",
      text: KOMPLETTSANIERUNG_SCHRITTE,
    },
    {
      schritt: "Was kostet eine Komplettsanierung in München 2026?",
      text: "Einfache Komplettsanierung (neue Oberflächen + Bad): 500–800 €/m². Umfassende Sanierung mit neuer Elektrik, Heizung und Grundrissänderung: 800–1.500 €/m². Für eine 70 m² Wohnung macht das 35.000–105.000 Euro je nach Standard. Im Münchner Altbau mit Besonderheiten (Asbest, alte Leitungen, enge Treppenhäuser) eher am oberen Ende.",
    },
    {
      schritt: "Wie lange dauert eine Komplettsanierung in München?",
      text: "Kleine Wohnung (50 m², nur Oberflächen + Bad): 6–10 Wochen. Mittlere Wohnung (70–90 m², mit Elektro und Grundriss): 10–16 Wochen. Größere Projekte oder Einfamilienhaus: 16–24 Wochen. Die Estrich-Trocknungszeit (2–4 Wochen) ist oft der kritische Pfad — hier kann nicht gearbeitet werden.",
    },
    {
      schritt: "Warum einen Generalunternehmer für die Komplettsanierung beauftragen?",
      text: "Weil bei einer Komplettsanierung 6–10 verschiedene Gewerke in der richtigen Reihenfolge kommen müssen. Wenn ein Gewerk einen Tag zu spät fertig ist, kann das nächste nicht starten — das kostet Geld und verschiebt den Einzugstermin. Bärenwald München koordiniert alle Betriebe intern, hält den Zeitplan und ist bei Problemen der einzige Ansprechpartner.",
    },
    {
      schritt: "Was sind typische Probleme bei Komplettsanierungen im Münchner Altbau?",
      text: "Asbest in alten Bodenbelägen und Putzen (Baujahr vor 1993 — Entsorgungskosten 1.000–5.000 Euro extra), Aluminiumleitungen, die komplett ersetzt werden müssen, keine Vorkompression für Schallschutz zwischen den Stockwerken, und statische Überraschungen bei Wanddurchbrüchen. Bärenwald plant 15 % Puffer für Altbau-Projekte ein.",
    },
  ],
  faq: [
    {
      q: "Kann ich während einer Komplettsanierung in der Wohnung wohnen?",
      a: "In der Regel nein — für 6–16 Wochen ist die Wohnung nicht bewohnbar. Wir planen den Zeitraum im Vorfeld und beraten zur Zwischenlösung.",
    },
    {
      q: "Gibt es Förderungen für Komplettsanierungen in München?",
      a: "KfW fördert energetische Sanierungen (Dämmung, Fenster, Heizung) mit zinsgünstigen Krediten und Zuschüssen. BAFA fördert Wärmepumpen. Anträge müssen vor Beauftragung gestellt werden — wir unterstützen dabei.",
    },
    {
      q: "Was passiert wenn beim Sanieren unerwartete Probleme auftauchen?",
      a: "Bärenwald informiert sofort und bespricht das Vorgehen gemeinsam — kein Nachtrag ohne deine Zustimmung. Für Altbau-Projekte planen wir immer einen Puffer ein.",
    },
    {
      q: "Wie bekomme ich ein Festpreisangebot für meine Komplettsanierung?",
      a: "Nach einem Vor-Ort-Termin (Anfahrt wird bei Beauftragung angerechnet) erstellt Bärenwald ein detailliertes Festpreisangebot. Online Preisrahmen als erste Orientierung: baerenwaldmuenchen.de/rechner.",
    },
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Komplettsanierung in München",
  rechnerSituation: "erneuern",
  ctaRechnerLabel: "Preisrahmen berechnen →",
  finalCtaPhoneFirst: true,
};

export const GUIDE_PAGES: RatgeberData[] = [
  generalunternehmerVsEinzelhandwerkerMuenchen,
  besteGeneralunternehmerMuenchen,
  zuverlaessigenHandwerkerFindenMuenchen,
  notfallHandwerkerMuenchen,
  renovierungMuenchenCheckliste,
  komplettsanierungAblaufMuenchen,
];
