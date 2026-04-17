import type { RatgeberData } from "@/lib/ratgeber/types";

const DATES_STD = { datePublished: "2024-06-01", dateModified: "2025-01-15" } as const;

export const badSanierungKostenMuenchen: RatgeberData = {
  slug: "bad-sanierung-kosten-muenchen",
  titel: "Badsanierung Kosten München",
  metaTitle: "Badsanierung München Kosten 2025 — Komplett & Teilsanierung",
  metaDescription:
    "Was kostet eine Badsanierung in München? Richtpreise 2024/25 für Komplett- und Teilsanierung, Faktoren, Ablauf und typische Münchner Altbausituationen.",
  hero: {
    headline: "Was kostet ein neues Bad? Preise für München 2025",
    subline:
      "Von der kleinen Auffrischung bis zum komplett neuen Bad — was es wirklich kostet und wie lange es dauert.",
  },
  wannBrauche: {
    title: "Wann lohnt sich eine Badsanierung?",
    punkte: [
      "Silikonfugen sind porös, Fliesen locker oder undicht",
      "Armaturen und Rohre wirken alt — viel Wasser, unbequem in der Nutzung",
      "Schimmel oder Feuchte an kritischen Stellen",
      "Vor Vermietung oder Verkauf zur Werterhöhung",
      "Barrierefreier Umbau oder Familienzuwachs",
      "Elektro/Lüftung entspricht nicht mehr dem Stand der Technik",
    ],
  },
  ablauf: [
    { schritt: "Ist-Analyse & Wünsche", text: "Wir erfassen Bestand, Leitungen, statische Vorgaben und deine Must-haves." },
    { schritt: "3D/Grundriss & Angebot", text: "Material und Handwerker werden festgelegt — transparentes Festpreisangebot." },
    { schritt: "Freigaben & Bestellung", text: "Hausverwaltung oder Eigentümerversammlung, Lieferzeiten für Keramik und Armaturen." },
    { schritt: "Rohbau & Leitungen", text: "Demontage, Estrich, Elektro, Wasserleitungen, Dämmung nach DIN." },
    { schritt: "Fliesen & Installation", text: "Fliesen, Duschtasse oder ebenerdig, Armaturen, WC, Lüftung." },
    { schritt: "Abschluss & Kontrolle", text: "Maler, Silikon, Reinigung — gemeinsame Kontrolle am Ende mit Protokoll." },
  ],
  voraussetzungen: [
    "Wasser muss zeitweise abstellbar sein (Kurzabsperrung abstimmen)",
    "Bei Mietwohnung: Schriftliche Zustimmung des Vermieters",
    "Entsorgung Bauschutt nur über zugelassene Entsorger — oft über die Hausgemeinschaft",
    "Elektroarbeiten nur durch Elektrofachbetrieb",
    "Bei WEG: Terminfenster und Zufahrt für Material mit der Verwaltung klären",
  ],
  materialien: [
    { name: "Feinsteinzeug großformatig", beschreibung: "Pflegeleicht, wenig Fugen, modern.", vonBis: "65–120 €/m² inkl. Verlegung", fuer: "Boden & Wand, ebenerdige Duschen" },
    { name: "Mittelformat Fliese", beschreibung: "Robuster Klassiker, vielfältige Designs.", vonBis: "45–85 €/m² inkl. Verlegung", fuer: "Standard-Bäder, Budget-orientiert" },
    { name: "Waschtisch & Möbel", beschreibung: "Holz, Mineralwerkstoff oder Keramik.", vonBis: "400–2.800 €", fuer: "Stauraum & Optik" },
    { name: "Armaturen & Duschsystem", beschreibung: "Hansgrohe, Grohe & Co. — langlebig und reparierbar.", vonBis: "250–1.200 € pro Position", fuer: "Komfort & Wassersparen" },
  ],
  kosten: {
    einheit: "Komplettbad typisch inkl. aller Leistungen",
    von: 6500,
    bis: 22000,
    faktoren: [
      "Umfang: Teilsanierung vs. alles neu inkl. Estrich",
      "Fliesenformat und Sondermaße",
      "Statik: Wände entfernen oder versetzen",
      "Ebenerdig vs. Wanne + Dusche",
      "Lüftung nachrüsten (Schacht, Außenwand)",
      "Münchner Altbaulage: enge Treppenhäuser, keine Außenaufzüge",
    ],
    beispiel:
      "6 m² Altbau-Bad, Komplettsanierung, Standardfliesen, ebenerdige Dusche, neues WC: ca. 14.000 – 18.000 € in München (inkl. Koordination).",
  },
  zeitaufwand: {
    klein: "3–7 Tage",
    mittel: "2–3 Wochen",
    gross: "4–6 Wochen",
    faktoren: [
      "Leitungsführung und Estricharbeiten",
      "Lieferzeit Sonderfliesen",
      "Parallelnutzung zweites Bad",
      "Genehmigungen in der WEG",
    ],
  },
  koordination:
    "Bärenwald plant alle Handwerker, synchronisiert Wasser und Heizung, Fliesen, Elektro und neue Wände (Trockenbau) und hält einen Festpreisrahmen — du hast nur einen Ansprechpartner.",
  koordinationUsps: [
    "Ein Projektleiter für alle Handwerker",
    "Festpreis nach detailliertem Ausmessen vor Ort",
    "Reklamation & Nachbesserung zentral",
  ],
  faq: [
    { q: "Kann ich während der Sanierung im Objekt bleiben?", a: "Bei Komplettsanierung oft nur eingeschränkt — wir planen Wasser- und WC-Engpässe mit dir." },
    { q: "Was kostet nur neue Armaturen und Fugen?", a: "Teilsanierungen starten oft bei 2.500–5.500 €, abhängig von Zugänglichkeit und Material." },
    { q: "Gibt es Förderungen?", a: "KfW unterstützt u. a. barrierefreie Umbauten — wir prüfen Förderfähigkeit und Anträge." },
    { q: "Wer entsorgt den Bauschutt?", a: "Entsorgung ist im Angebot enthalten und wird dokumentiert — wichtig in Münchner Wohnanlagen." },
    { q: "Brauche ich einen Statiker?", a: "Bei tragenden Wänden oder größeren Öffnungen ja — wir koordinieren die Prüfung." },
    { q: "Wie lange dauert die Trocknung?", a: "Estrich und Spachtel brauchen oft mehrere Tage bis Wochen — Fliesen erst nach ausreichender Trocknung." },
  ],
  qualitaet: [
    "Saubere, durchgehende Fugen ohne Hohlräume",
    "Gefälle zur Duschablauf hin fachgerecht",
    "Dichtigkeit Prüfung vor Fliesen (Dichtfolie, Anschlüsse)",
    "Elektro FI/LS nach aktueller Norm",
    "Dokumentation Fotos & Kontrollprotokoll",
  ],
  muenchen: [
    "🏢 In vielen Münchner WEGs gelten strenge Ruhezeiten und kurze Lieferfenster — Logistik muss sitzen",
    "🏚️ Altbau: Leitungen in unbekannten Verläufen — Probebohrungen und Puffer einplanen",
    "🅿️ Parken in Schwabing & Außenbezirken begrenzt — Materialübernachtung auf der Baustelle klären",
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Badezimmer sanieren in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const bodenbelagKostenMuenchen: RatgeberData = {
  slug: "bodenbelag-kosten-muenchen",
  titel: "Bodenbelag Kosten München",
  metaTitle: "Neuer Boden München — Kosten Laminat, Parkett, Fliesen 2025",
  metaDescription:
    "Was kostet neuer Boden in München? Preise pro m² für Laminat, Parkett, Vinyl und Fliesen inkl. Verlegung, Untergrund und typische Altbauprobleme.",
  hero: {
    headline: "Was kostet neuer Boden? Laminat, Parkett, Fliesen in München",
    subline:
      "Welches Material passt zu dir, was kostet Verlegen und worauf du beim Kauf achten solltest.",
  },
  wannBrauche: {
    title: "Wann solltest du neu verlegen?",
    punkte: [
      "Der Boden quietscht, ist wellig oder beschädigt",
      "Feuchteschäden oder Verformung nach Leckage",
      "Vor Vermietung für bessere Mieteinnahmen",
      "Schallschutz verbessern (Mietwohnung, Nachbarn unten)",
      "Optischer Wechsel bei Renovierung",
      "Barrierefreiheit (ebenerdig, rutschfest)",
    ],
  },
  ablauf: [
    { schritt: "Beratung & Muster", text: "Materialwahl, Nutzungsprofil (Feuchte, Haustiere) und Muster mitbringen." },
    { schritt: "Untergrund prüfen", text: "Ebenheit, Feuchte, alte Kleberückstände — ggf. Spachtel oder Trockenestrich." },
    { schritt: "Angebot", text: "Festpreis inkl. Dämmung, Sockel, Übergänge, Entsorgung Altbelag." },
    { schritt: "Vorbereitung", text: "Absenken Türen, Trittschalldämmung nach DIN, Feuchtesperre wo nötig." },
    { schritt: "Verlegung", text: "Klick, Klebe- oder Schiffsboden — fachgerechte Dehnungsfugen." },
    { schritt: "Abschluss", text: "Sockelleisten, Silikon an Feuchträumen, Übergänge zu Fliesen." },
  ],
  voraussetzungen: [
    "Räume sollten leer oder zur Mitte geräumt sein",
    "Bei Mietwohnung: Schriftliche Erlaubnis für Trittschalldämmung / Türkürzung",
    "Heizung Fußbodenheizung: max. Aufbauhöhe beachten",
    "Feuchtraum: nur zugelassene Materialien",
    "Altbelag: Asbestverdacht vor 1990 klären lassen",
  ],
  materialien: [
    { name: "Laminat", beschreibung: "Günstig, robust, schnell verlegt.", vonBis: "35–55 €/m² inkl. Verlegung", fuer: "Wohn- und Schlafzimmer" },
    { name: "Vinyl / Designboden", beschreibung: "Wasserfest, leise, oft dünn — ideal bei FH.", vonBis: "40–70 €/m² inkl. Verlegung", fuer: "Küche, Bad, Flur" },
    { name: "Parkett Eiche", beschreibung: "Wertstabil, warm, nachölfbar.", vonBis: "75–140 €/m² inkl. Verlegung", fuer: "Wohnbereiche, Büro" },
    { name: "Fliesen", beschreibung: "Sehr belastbar, gut für Feuchträume.", vonBis: "65–120 €/m² inkl. Verlegung", fuer: "Bad, Küche, Terrasse" },
  ],
  kosten: {
    einheit: "pro m² inkl. Verlegung (ohne Material teils extra ausgewiesen)",
    von: 35,
    bis: 140,
    faktoren: [
      "Untergrundausgleich und Spachtelmasse",
      "Trittschalldämmung (besonders in Mietwohnungen)",
      "Entsorgung und Anfahrt Innenstadt",
      "Sonderformate und Muster",
      "Treppen und schmale Räume",
      "Fußbodenheizung: dünnere Aufbauten = höherer Materialpreis",
    ],
    beispiel:
      "3-Zimmer-Wohnung 70 m², Laminat mittlere Qualität, Trittschalldämmung, Sockel: ca. 4.500 – 7.500 € in München.",
  },
  zeitaufwand: {
    klein: "1 Tag / Raum",
    mittel: "3–5 Tage",
    gross: "1–2 Wochen",
    faktoren: [
      "Trocknungszeiten bei Spachtel/Estrich",
      "Menge der Türkürzungen",
      "Entsorgung Altbelag",
    ],
  },
  koordination:
    "Wir stimmen Boden mit Maler- und Elektroterminen ab und sorgen für korrekte Übergänge zu Fliesen und Feuchträumen.",
  koordinationUsps: [
    "Untergrund-Check inklusive",
    "Trittschall-Dokumentation für Mieter",
    "Festpreis mit Sockel & Übergängen",
  ],
  faq: [
    { q: "Kann Vinyl auf Fliesen?", a: "Oft ja, wenn eben und tragfähig — wir prüfen Fugen und Höhenunterschiede." },
    { q: "Brauche ich neue Fußleisten?", a: "Meist ja — Höhen ändern sich durch Dämmung." },
    { q: "Was ist mit Fußbodenheizung?", a: "Aufbauhöhe und zugelassene Aufbauten sind kritisch — wir wählen dünnere Systeme." },
    { q: "Wer räumt Möbel?", a: "Leere Räume sind ideal — sonst koordinieren wir Hubwagen oder Teilmöbelrücken." },
    { q: "Gibt es Garantie auf Verlegung?", a: "Ja — Herstellervorgaben und fachbetriebliche Kontrolle am Ende." },
    { q: "Parkett ölen oder versiegeln?", a: "Öl fühlt sich wärmer an, Lack pflegeleichter — wir beraten nach Nutzung." },
  ],
  qualitaet: [
    "Ebene Unterlage ohne Stufen (<2 mm Toleranz je nach System)",
    "Saubere Dehnungsfugen an großen Flächen",
    "Geräuscharme Trittschalllösung nach Nachweis",
    "Sockelleisten ohne sichtbare Lücken",
    "Übergänge zu anderen Böden bündig",
  ],
  muenchen: [
    "🔊 Viele Altbauwohnungen in Sendling & Giesing haben strenge Schallvorgaben — Dokumentation wichtig",
    "🚚 Innenhöfe und enge Treppenhäuser in Lehel erhöhen oft Logistikkosten",
    "🌡️ Fußbodenheizung in Neubau Pasing-Gröbenzell häufig — Aufbauhöhe begrenzt Materialwahl",
  ],
  leistungsSlug: "bodenbelag",
  leistungsLabel: "Bodenbelag verlegen in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const heizungTauschenKosten: RatgeberData = {
  slug: "heizung-tauschen-kosten",
  titel: "Heizung tauschen Kosten",
  metaTitle: "Heizung tauschen München — Kosten, Wärmepumpe & Förderung 2025",
  metaDescription:
    "Was kostet ein Heizungstausch in München? Kosten für Gas, Wärmepumpe, Hydraulik, Förderung BAFA/KfW und typische Bestandsfälle im Altbau.",
  hero: {
    headline: "Wann lohnt sich eine neue Heizung — und was kostet das?",
    subline:
      "Alte Heizung gegen Wärmepumpe tauschen — Kosten, Förderung und wann es wirklich Sinn macht.",
  },
  wannBrauche: {
    title: "Wann ist ein Tausch sinnvoll?",
    punkte: [
      "Heizung älter als 15–20 Jahre und steigende Reparaturkosten",
      "Umstieg von Öl/Gas auf Wärmepumpe aus Klima- und Kostengründen",
      "Sanierung mit Fußbodenheizung oder Flächenheizung",
      "Förderfenster nutzen (BAFA/KfW)",
      "Unzureichende Effizienzklasse / hohe CO2-Kosten",
      "Erweiterung um Kühlfunktion oder Brauchwasser",
    ],
  },
  ablauf: [
    { schritt: "Energieberatung light", text: "Heizlast, Hydraulik, Platz für Außen/WP innen prüfen." },
    { schritt: "Angebot & Fördercheck", text: "Varianten Gas-Brennwert vs. WP, Wirtschaftlichkeit 15 Jahre." },
    { schritt: "Antrag Förderung", text: "Vorhaben registrieren, Fachbetrieb — wir unterstützen bei Unterlagen." },
    { schritt: "Demontage & Installation", text: "Rückbau Altanlage, neue Komponenten, Speicher, Heizkreis." },
    { schritt: "Inbetriebnahme", text: "Hydraulischer Abgleich, Übergabe, Einweisung App/Regelung." },
    { schritt: "Nachweis", text: "Fördernachweise und Dokumentation für Behörden." },
  ],
  voraussetzungen: [
    "Hausanschluss und Hauptleitungen zugänglich",
    "Bei Mietwohnung: Eigentümerbeschluss / technische Zustimmung",
    "Platz Außenaufstellung oder Schallkonzept Innen",
    "Elektro: ggf. Zähler/Anlagen erweitern",
    "Winter: Übergangsheizung abstimmen",
  ],
  materialien: [
    { name: "Gas-Brennwert", beschreibung: "Brückentechnologie, geringere Investition als WP.", vonBis: "8.000–15.000 €", fuer: "Wenn WP aktuell nicht machbar" },
    { name: "Luft-Wasser-Wärmepumpe", beschreibung: "Standard in Einfamilienhäusern, Förderfähig.", vonBis: "18.000–35.000 €", fuer: "Eigenheim, Dachausbau" },
    { name: "Pufferspeicher", beschreibung: "Hydraulische Entkopplung, Komfort.", vonBis: "1.200–3.500 €", fuer: "Flächenheizung & WP" },
    { name: "Heizkreisverteiler neu", beschreibung: "Aktuatoren, Raumthermostate digital.", vonBis: "900–2.800 €", fuer: "Altbau-Sanierung" },
  ],
  kosten: {
    einheit: "typische Investition Wärmepumpe EFH inkl. Installation",
    von: 18000,
    bis: 35000,
    faktoren: [
      "Heizlast und Gebäudedämmung",
      "Außen vs. Innenaufstellung",
      "Hydraulik komplett neu vs. Teilerneuerung",
      "Kernbohrungen und Leitungswege",
      "Förderquote abhängig von Einkommen / Effizienzhaus",
      "München: begrenzte Außenflächen bei Reihenhaus",
    ],
    beispiel:
      "Reihenhaus München-Riem, Luft-Wasser-WP, Puffer, hydraulischer Abgleich, Förderung berücksichtigt: Netto oft 12.000–22.000 €.",
  },
  zeitaufwand: {
    klein: "2–4 Tage",
    mittel: "1–2 Wochen",
    gross: "3–5 Wochen",
    faktoren: [
      "Leitungsarbeiten in unbekanntem Altbaubestand",
      "Lieferzeit WP",
      "Parallelheizen Winter",
    ],
  },
  koordination:
    "Wir bündeln SHK, Elektro und ggf. Dach für Außenaufstellung und kümmern uns um Förderfähigkeit und Termine.",
  koordinationUsps: [
    "Förderantrag-Begleitung",
    "Festpreis nach technischer Klärung",
    "Inbetriebnahme & Kontrolle dokumentiert",
  ],
  faq: [
    { q: "Lohnt sich eine Wärmepumpe in München?", a: "Bei gedämmtem Bestand oft ja — Strompreis vs. Gas/Oil und Förderung rechnen wir vor." },
    { q: "Brauche ich eine neue Heizungsanlage komplett?", a: "Nicht immer — manchmal reicht Brennwerttausch, oft lohnt aber Gesamtpaket." },
    { q: "Was ist mit Mieterstrom/Wärme?", a: "Rechtliche Modelle sind komplex — wir verweisen auf Eigentümerstruktur." },
    { q: "Gibt es Notfall bei Heizungsausfall?", a: "Ja — akute Fälle priorisieren wir, Übergangsheizlösungen möglich." },
    { q: "Hydraulischer Abgleich Pflicht?", a: "Für Förderung und Effizienz ja — wird dokumentiert." },
    { q: "Wie lange hält eine WP?", a: "Wartung vorausgesetzt 15–20 Jahre für Verdampfer/Kompressor-Teile." },
  ],
  qualitaet: [
    "Dimensionierung nach DIN/Heizlast",
    "Saubere Isolierung Kältemittelleitungen",
    "Schalloptimierung Innen/Außen",
    "Regelung mit effizienten Kurven",
    "Wartungsvertrag und Servicehinweise",
  ],
  muenchen: [
    "🏙️ Hohe Grundstückspreise: kompakte Technikräume — oft WP innen oder Dachlösung",
    "❄️ Kalte Wintertage: WP-Modell mit hoher Vorlauftemperatur oder Hybrid prüfen",
    "📑 Viele Münchner Bestandshäuser brauchen Abstimmung mit Denkmalschutz bei sichtbaren Außeneinheiten",
  ],
  leistungsSlug: "heizung-sanitaer",
  leistungsLabel: "Heizung & Wasser in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const wohnungRenovierenKostenMuenchen: RatgeberData = {
  slug: "wohnung-renovieren-kosten-muenchen",
  titel: "Wohnung renovieren Kosten",
  metaTitle: "Wohnung renovieren München — Gesamtkosten & Budget 2025",
  metaDescription:
    "Was kostet eine Wohnungsrenovierung in München? Kosten je m², Mix aus Handwerksleistungen, Altbaueffekte und wie du Budget & Reihenfolge sinnvoll planst.",
  hero: {
    headline: "Was kostet es eine Wohnung renovieren zu lassen? München 2025",
    subline:
      "Komplette Übersicht — was einzelne Bereiche kosten, wie lange es dauert und wie du günstig aber gut renovierst.",
  },
  wannBrauche: {
    title: "Wann solltest du planen?",
    punkte: [
      "Einzug in gebrauchte Wohnung mit veralteter Ausstattung",
      "Verkaufsvorbereitung (neutral, hell, gepflegt)",
      "Kombination Bad + Boden + Elektro",
      "Energetische Verbesserung (Fenster, Dämmung)",
      "Umnutzung Zimmer / Homeoffice",
      "Schadensfall (Wasserbrand)",
    ],
  },
  ablauf: [
    { schritt: "Zielbild & Budget", text: "Must-haves vs. Nice-to-have, Puffer 10–15 % einplanen." },
    { schritt: "Bestandsaufnahme", text: "Leitungen, Statik, Schallschutz, Hausordnung." },
    { schritt: "Ablaufplan", text: "Elektro → neue Wände (Trockenbau) → Boden → Maler — klassische Reihenfolge." },
    { schritt: "Angebote", text: "Festpreise pro Handwerker oder Generalübernehmer-Paket." },
    { schritt: "Ausführung", text: "Tägliche Koordination, saubere Übergaben zwischen den Beteiligten." },
    { schritt: "Gemeinsame Kontrolle am Ende", text: "Punch-Liste, Gewährleistung, Unterlagen für Vermieter." },
  ],
  voraussetzungen: [
    "Genehmigungen bei tragenden Eingriffen",
    "Ruhezeiten und Arbeiten an Sonn- und Feiertagen beachten",
    "Mülltonnenplatz und Lieferfenster abstimmen",
    "Nachbarn informieren bei Schall intensiven Arbeiten",
    "Versicherungsschutz bei Umbau prüfen",
  ],
  materialien: [
    { name: "Bodenpaket mittel", beschreibung: "Laminat/Vinyl inkl. Dämmung.", vonBis: "45–85 €/m²", fuer: "Komplette Wohnung" },
    { name: "Malerpaket", beschreibung: "Standardfarbe, 2 Lagen.", vonBis: "12–22 €/m² Wand", fuer: "Alle Räume" },
    { name: "Elektro-Paket", beschreibung: "Steckdosen/Licht modernisieren.", vonBis: "3.000–8.000 €", fuer: "70 m² Wohnung" },
    { name: "Bad leicht", beschreibung: "Ohne Kernsanierung.", vonBis: "4.000–9.000 €", fuer: "Auffrischung" },
  ],
  kosten: {
    einheit: "Komplettrenovierung üblicher Wohnung (Mittelklasse)",
    von: 800,
    bis: 1800,
    faktoren: [
      "Ausstattungslinie (Möbelbau, Küche, Bad)",
      "Altbauelektrik komplett",
      "Fußbodenheizung nachrüsten",
      "Deckenhöhe und Stuck",
      "Außenarbeiten/Balkon",
      "Verfügbarkeit Handwerker München",
    ],
    beispiel:
      "70 m² Altbau, neue Elektro teilweise, neuer Boden, Maler, Bad leicht: ca. 55.000 – 85.000 €.",
  },
  zeitaufwand: {
    klein: "2–4 Wochen",
    mittel: "6–10 Wochen",
    gross: "3–5 Monate",
    faktoren: [
      "Lieferzeiten Küche & Fenster",
      "Parallele Handwerker auf der Baustelle",
      "Genehmigungen",
    ],
  },
  koordination:
    "Bärenwald plant die kritische Pfadlogik — wer wann muss fertig sein — und verhindert teure Leerläufe zwischen Maler und Bodenleger.",
  koordinationUsps: [
    "Ein Budget- und Terminplan",
    "Gemeinsame Kontrolle am Ende je Leistung",
    "Zentrale Reklamation",
  ],
  faq: [
    { q: "Was kostet nur Kosmetik?", a: "Boden + Maler ohne Elektro oft 15.000–35.000 € bei 70 m² — stark materialabhängig." },
    { q: "Soll ich einzeln vergeben?", a: "Einzelvergabe kann günstiger wirken — Koordinationsaufwand steigt stark." },
    { q: "Wie plane ich Puffer?", a: "10–15 % Reserve + 1–2 Wochen Zeitpuffer bei Altbaubohrungen." },
    { q: "Muss der Vermieter alles genehmigen?", a: "Rückbaustatus und bauliche Änderungen ja — Farbe oft nein, aber Vertrag lesen." },
    { q: "Was ist teurer in München?", a: "Logistik, Parken, hohe Auslastung Meisterbetriebe — Planung im Vorfeld spart Geld." },
    { q: "Kann ich in Etappen renovieren?", a: "Ja — wir priorisieren Bad/Elektro zuerst, um Stillstände zu vermeiden." },
  ],
  qualitaet: [
    "Klare Übergaben zwischen den Handwerkern dokumentiert",
    "Fotodokumentation vor Start",
    "Kontrollprotokolle je Leistung",
    "Staubschutz in Mietobjekten",
    "Gewährleistungsfristen im Blick",
  ],
  muenchen: [
    "🅿️ Baustellenlogistik in Bogenhausen & Harlaching: Anwohnerparken und Hoftore koordinieren",
    "🏚️ Altbau: Leitungen „wild“ — Probebohrungen und höhere Risikopauschalen üblich",
    "📈 Hohe Nachfrage Q2/Q3 — früh buchen lohnt sich",
  ],
  leistungsSlug: "malerarbeiten",
  leistungsLabel: "Malerarbeiten in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const gartenpflegeKostenMuenchen: RatgeberData = {
  slug: "gartenpflege-kosten-muenchen",
  titel: "Gartenpflege Kosten München",
  metaTitle: "Gartenpflege München — Preise pro m², Rhythmus & Saison 2025",
  metaDescription:
    "Was kostet Gartenpflege in München? Richtpreise 2024/25, Rasen, Hecken, Laub, Abo vs. Einzeltermin und lokale Regeln (Brut- und Vegetationsschutz).",
  hero: {
    headline: "Was kostet Gartenpflege in München?",
    subline:
      "Preise für Mähen, Schneiden und Pflegen — wann es sich lohnt jemanden zu beauftragen.",
  },
  wannBrauche: {
    title: "Wann lohnt sich professionelle Pflege?",
    punkte: [
      "Regelmäßiger Rasenschnitt ohne eigene Zeit",
      "Heckenpflege nach Vorschriften und Formschnitt",
      "Laub im Herbst in kurzer Zeit beseitigen",
      "Beete unkrautfrei vor Vermietung/Verkauf",
      "Bewässerung während Urlaubszeit",
      "Objektbetreuung für Vermieter & WEG",
    ],
  },
  ablauf: [
    { schritt: "Begehung", text: "Fläche, Hanglagen, Zugang, Kompostplatz klären." },
    { schritt: "Pflegeplan", text: "Wöchentlich, 14-tägig oder monatlich — Saisonpaket." },
    { schritt: "Angebot", text: "Festpreis pro Einsatz oder Pauschale pro Saison." },
    { schritt: "Erste Session", text: "Grundschnitt, Kanten, grober Aufräumtag." },
    { schritt: "Laufende Pflege", text: "Rasen, Hecken, Beete, Laub nach Plan." },
    { schritt: "Winterpause", text: "Winterschnitt Hecken nach Fristen, Geräte winterfest." },
  ],
  voraussetzungen: [
    "Zugang durch Hausflur oder Seiteneingang freimachen",
    "Kompost / Grüngutannahme der Stadt nutzen oder Container",
    "Brut- und Vegetationsschutz bei Hecken beachten",
    "Leitungswasser für Bewässerung verfügbar",
    "Hund / Nutzung Rasen kurz abstimmen",
  ],
  materialien: [
    { name: "Rasenpflege-Paket", beschreibung: "Mähen, Kanten, Düngung optional.", vonBis: "35–65 €/Einsatz", fuer: "Stadtgarten bis 200 m²" },
    { name: "Heckenschnitt", beschreibung: "Formschnitt oder Freihand je nach Art.", vonBis: "15–35 € laufender Meter", fuer: "Thuja, Liguster" },
    { name: "Laubdienst", beschreibung: "Mehrere Durchgänge Nov–Dez.", vonBis: "80–220 €/Besuch", fuer: "Laubbäume Innenhof" },
    { name: "Beetpflege", beschreibung: "Jäten, Mulchen, Pflanzung.", vonBis: "45–95 €/Stunde", fuer: "Staudenbeete" },
  ],
  kosten: {
    einheit: "typisch pro Monat inkl. Rasen & Kanten (ca. 100–150 m²)",
    von: 180,
    bis: 420,
    faktoren: [
      "Fläche und Hang",
      "Häufigkeit der Einsätze",
      "Entsorgung Laub/Schnittgut",
      "Zugang (Hinterhof, Aufzug)",
      "Zusatz Bewässerung / Düngung",
      "München: enge Grundstücke, mehr Handarbeit",
    ],
    beispiel:
      "Reihenhausgarten 120 m², Rasen 14-tägig, Hecken 2×/Jahr, Laub 3×: ca. 220 – 320 €/Monat in der Saison.",
  },
  zeitaufwand: {
    klein: "1–2 Std./Besuch",
    mittel: "3–5 Std./Besuch",
    gross: "1–2 Tage (Großreinigung)",
    faktoren: [
      "Wetterfenster Rasen",
      "Trockenphasen Sommer",
      "Nachwuchs Hecken",
    ],
  },
  koordination:
    "Wir kombinieren Gartenpflege mit Winterdienst und optional Hausmeister — ein Team, ein Kalender.",
  koordinationUsps: [
    "Saisonfeste Paketpreise",
    "Urlaubsvertretung möglich",
    "Entsorgung inklusive",
  ],
  faq: [
    { q: "Brauche ich ein Abo?", a: "Nein — Einzeltermine möglich, Abo ist günstiger pro Besuch." },
    { q: "Wann darf ich hecken?", a: "In Bayern Brut- und Vegetationsschutz beachten — wir planen legal." },
    { q: "Was ist mit Biomülltonne?", a: "Grünschnitt wird getrennt entsorgt oder kompostiert je nach Angebot." },
    { q: "Kann ich nur Laub?", a: "Ja — Saisonpakete für 2–4 Laubgänge üblich." },
    { q: "Gießen bei Trockenheit?", a: "Zusatzmodul — Hand oder automatische Kreise." },
    { q: "Haftung für Pflanzen?", a: "Wir dokumentieren Zustand vorher/nachher bei Formschnitten." },
  ],
  qualitaet: [
    "Scharfe Messer, kein Rasenstress",
    "Saubere Kanten und Mulchsaum",
    "Heckenschnitt ohne kahle Stellen",
    "Laub ohne Verstopfung der Gullys",
    "Pünktliche Termintreue",
  ],
  muenchen: [
    "🌳 Viele Innenhöfe in Ludwigsvorstadt ohne direkten Kfz-Zugang — Zeitkosten höher",
    "☀️ Heiße Sommer: Rasen Stress — Schnitthöhe und Rhythmus anpassen",
    "🏘️ Reihenhaus: Nachbarhecken absprechen — gemeinsame Schnittkante",
  ],
  leistungsSlug: "gartenpflege",
  leistungsLabel: "Gartenpflege in München",
  rechnerSituation: "pflege",
  ...DATES_STD,
};

export const winterdienstKostenMuenchen: RatgeberData = {
  slug: "winterdienst-kosten-muenchen",
  titel: "Winterdienst München Kosten",
  metaTitle: "Winterdienst München — Kosten, Streupflicht & Saison 2025",
  metaDescription:
    "Was kostet Winterdienst in München? Saisonpreise, Streupflicht, Dokumentation, umweltfreundliches Streugut und typische Objekte in Wohnanlagen.",
  hero: {
    headline: "Winterdienst in München — was kostet das und was muss ich?",
    subline:
      "Streupflicht, Haftung und Preise — alles was Münchner Hausbesitzer wissen müssen.",
  },
  wannBrauche: {
    title: "Wann brauchst du einen Dienst?",
    punkte: [
      "Du bist streupflichtig (Eigentümer / Mieter laut Vertrag)",
      "Gewerbliche Fläche mit Kundenverkehr",
      "WEG ohne Hausmeister",
      "Mehrfamilienhaus mit langem Gehweg",
      "Du willst Haftungsnachweis durch Dokumentation",
      "Umweltzone Innenstadt: spezielles Streugut",
    ],
  },
  ablauf: [
    { schritt: "Begehung", text: "Gehweglänge, Flächen, Gefälle, Müllplatz-Zugang." },
    { schritt: "Vertrag", text: "Frequenz, Bereitschaftszeiten, Streugut, Haftungsübergang." },
    { schritt: "Saisonstart", text: "Oktober: Material lagern, Kontakte Winter." },
    { schritt: "Einsätze", text: "Bei Glätte oder Schnee gemäß Plan — ggf. Nachtdienst." },
    { schritt: "Dokumentation", text: "Foto/Zeitstempel für WEG-Protokolle." },
    { schritt: "Saisonende", text: "April: Restmaterial, Schaden prüfen, Abrechnung." },
  ],
  voraussetzungen: [
    "Klarer Zuständigkeitsbereich (Grundstücksgrenzen)",
    "Zugang zu Wasser/Streugutlager",
    "Mülltonnenstellplatz nicht blockieren",
    "Beschilderung Glasplitter vermeiden",
    "Winterdienstplan in der WEG beschließen",
  ],
  materialien: [
    { name: "Saisonpauschale EFH", beschreibung: "Gehweg + Einfahrt Standard.", vonBis: "620–950 €/Saison", fuer: "Einfamilienhaus" },
    { name: "Mehrfamilienhaus", beschreibung: "Inkl. Bereitschaft & Dokumentation.", vonBis: "900–1.800 €/Saison", fuer: "WEG klein" },
    { name: "Gewerbeobjekt", beschreibung: "Hohe Frequenz, lange Wege.", vonBis: "ab 1.500 €/Saison", fuer: "Praxis, Kita" },
    { name: "Streugut umweltfreundlich", beschreibung: "Splitt/Salzgemisch je Vorgabe.", vonBis: "inkl. oder +120–280 €", fuer: "Saisonbedarf" },
  ],
  kosten: {
    einheit: "typische Saisonpauschale (Okt–Apr) Privat",
    von: 620,
    bis: 1400,
    faktoren: [
      "Gehweglänge und Fläche",
      "Nacht- und Wochenendbereitschaft",
      "Anzahl paralleler Zufahrten",
      "Streugutqualität",
      "Dokumentationsaufwand WEG",
      "Innenstadt: Parken & Wegstrecke",
    ],
    beispiel:
      "Stadthaus mit 35 m Gehweg, täglicher Räumdienst bei Glätte, umweltfreundliches Streugut: ca. 780 – 1.050 €/Saison.",
  },
  zeitaufwand: {
    klein: "15–30 Min./Einsatz",
    mittel: "45–90 Min./Einsatz",
    gross: "2–4 Std. (Schneefall viel)",
    faktoren: [
      "Schneefallintensität",
      "Eisregen",
      "Mehrfahrten pro Tag",
    ],
  },
  koordination:
    "Bärenwald kombiniert Winterdienst mit Hausmeister- und Gartenpaketen — ein Ansprechpartner, ein Kalender.",
  koordinationUsps: [
    "Rechtssichere Dokumentation",
    "Bereitschaft früh morgens",
    "Umweltfreundliches Streugut",
  ],
  faq: [
    { q: "Ab wann muss gestreut werden?", a: "Werktags ab 7 Uhr, sonn- und feiertags ab 9 Uhr — je nach örtlicher Satzung prüfen." },
    { q: "Haftet der Dienstleister?", a: "Mit sauberem Vertrag und Nachweisen wird die Pflicht übernommen — wir dokumentieren." },
    { q: "Salz oder Splitt?", a: "Mischung je Fläche und Umweltvorgaben — in sensiblen Lagen weniger Salz." },
    { q: "Was bei Dauerfrost?", a: "Glättebekämpfung bleibt — Schnee bei Bedarf mehrfach." },
    { q: "Kann ich nur Einzeltermine?", a: "Ja, teurer pro Einsatz — Saisonpauschale ist planbarer." },
    { q: "Dachlawinen?", a: "Separat vereinbaren — nicht automatisch im Standard." },
  ],
  qualitaet: [
    "Zeitnahe Räumung nach Wetter",
    "Saubere Kanten zu Nachbargrundstück",
    "Streugut dosiert, keine Überstreung",
    "Fotos / Logbuch auf Wunsch",
    "Versicherungsfähige AGB",
  ],
  muenchen: [
    "❄️ Stark schneien kann Innenstadthöfe blockieren — Logistik mit Fahrradanhänger oder kleinen Fahrzeugen",
    "🏢 Viele WEGs in Neuhausen fordern schriftliche Winterdienstpläne für Versicherungen",
    "🌿 Isar-Nähe: teils empfindliche Grünflächen — Streugutwahl abstimmen",
  ],
  leistungsSlug: "winterdienst",
  leistungsLabel: "Winterdienst München",
  rechnerSituation: "pflege",
  ...DATES_STD,
};

export const waermepumpeFoerderung2025: RatgeberData = {
  slug: "waermepumpe-foerderung-2025",
  titel: "Wärmepumpe Förderung 2025",
  metaTitle: "Wärmepumpe Förderung 2025 — BAFA, KfW & München Praxis",
  metaDescription:
    "Wärmepumpe fördern lassen 2025: BAFA-Bonus, Einkommensabhängigkeit, Effizienzhaus-Stufen und was Eigentümer in München konkret einreichen müssen.",
  hero: {
    headline: "Wärmepumpe 2025 — wie viel Förderung bekomme ich wirklich?",
    subline:
      "BAFA, KfW, Energieberatung — was gefördert wird, wie viel, und wie du den Antrag stellst.",
  },
  wannBrauche: {
    title: "Wann solltest du antragen?",
    punkte: [
      "Vor Beginn der Maßnahme (Fachbetrieb registrieren)",
      "Wenn Heizlast und Dämmung geklärt sind",
      "Bei Kombi mit erneuerbarer Warmwasserbereitung",
      "Wenn Eigentümerstruktur geklärt (WEG/ETW)",
      "Wenn Elektroanschluss ausreichend dimensioniert ist",
      "Wenn du langfristige Heizkosten senken willst",
    ],
  },
  ablauf: [
    { schritt: "Vor-Ort & Heizlast", text: "Technische Machbarkeit und WP-Typ wählen." },
    { schritt: "Förderweg wählen", text: "BAFA/KfW — Einkommensabhängige Zuschüsse prüfen." },
    { schritt: "Antrag stellen", text: "Vorhaben online registrieren, Bestätigung abwarten." },
    { schritt: "Ausführung", text: "Nur nach Zusage beginnen — Fachbetrieb dokumentiert." },
    { schritt: "Inbetriebnahme", text: "WP-Schein, hydraulischer Abgleich, Fotos." },
    { schritt: "Auszahlung", text: "Nachweise einreichen, Auszahlung verfolgen." },
  ],
  voraussetzungen: [
    "Fachunternehmerregistrierung vor Start",
    "Technische Mindestanforderungen (Effizienz, COP)",
    "Elektrische Anbindung geprüft",
    "Bei Denkmal: Außenoptik abstimmen",
    "WEG-Beschluss bei gemeinschaftlicher Anlage",
  ],
  materialien: [
    { name: "Luft-Wasser-WP Standard", beschreibung: "Klassisch für EFH.", vonBis: "Förderung bis ~70 % möglich", fuer: "Bestand gedämmt" },
    { name: "Sole-Wasser", beschreibung: "Wenn Fläche für Erdsonde.", vonBis: "Höhere Invest, gute COP", fuer: "Große Grundstücke" },
    { name: "Hydraulischer Abgleich", beschreibung: "Pflicht für Förderung.", vonBis: "600–1.800 €", fuer: "Alle Systeme" },
    { name: "Speicher & Heizstab", beschreibung: "Komfort & Notreserve.", vonBis: "1.000–3.500 €", fuer: "WP-Systeme" },
  ],
  kosten: {
    einheit: "Brutto-Invest Luft-Wasser-WP EFH vor Förderung",
    von: 22000,
    bis: 42000,
    faktoren: [
      "Einkommensabhängiger Zuschlag",
      "Effizienzhaus-Stufe Gesamtprojekt",
      "Außen vs. Innenaufstellung",
      "Hydraulik-Erneuerung",
      "Zusatz Solarthermie/PV",
      "München: begrenzte Außenfläche",
    ],
    beispiel:
      "EFH München-Fürstenried, Luft-Wasser-WP, hydraulischer Abgleich, Förderpaket: Netto-Invest oft 12.000–20.000 € (individuell).",
  },
  zeitaufwand: {
    klein: "2–4 Wochen Antrag",
    mittel: "6–10 Wochen bis Zusage",
    gross: "3–6 Monate inkl. Installation",
    faktoren: [
      "Behördenbearbeitung",
      "Lieferzeit WP",
      "Parallel Umbau",
    ],
  },
  koordination:
    "Wir verzahnen SHK, Elektro und Antragsstrecke — du bekommst Checklisten und Fristen, damit keine Förderung verfällt.",
  koordinationUsps: [
    "Antrags-Checkliste",
    "Fotodokumentation standardisiert",
    "Termin mit zertifiziertem Partner",
  ],
  faq: [
    { q: "Darf ich vor Antrag bohren?", a: "Nein — Maßnahmen erst nach Zusage starten, sonst Gefahr der Ablehnung." },
    { q: "Wie hoch ist der Bonus?", a: "Abhängig von Einkommen und Effizienz — wir rechnen Beispiele anhand aktueller Richtlinien." },
    { q: "PV dazu?", a: "Kombination möglich — separate Module, Synergien bei Eigenverbrauch." },
    { q: "Mietwohnung?", a: "Eigentümer entscheidet — Mieter können meist nur anregen." },
    { q: "Was ist mit Altölheizung?", a: "Austausch oft förderfähig — Altanlage fachgerecht demontieren." },
    { q: "Nachweise?", a: "Rechnungen, Zahlungsnachweise, WP-Schein, Fotos — strukturiert ablegen." },
  ],
  qualitaet: [
    "Zertifizierte Fachbetriebe",
    "Hydraulischer Abgleich dokumentiert",
    "Schallmessung Außen bei Bedarf",
    "Saubere Kältemitteldokumentation",
    "Einweisung Regelung & App",
  ],
  muenchen: [
    "🏙️ Viele Reihenhäuser in Trudering: wenig Platz für Außengerät — Schallschutzbox oder Innenvariante",
    "⚡ Stadtwerke München: Zählerkapazität prüfen bei gleichzeitig Wallbox",
    "📋 WEG-Häuser: Beschlussfähigkeit früh anstoßen — Verzögerungen kosten Förderfenster",
  ],
  leistungsSlug: "heizung-sanitaer",
  leistungsLabel: "Heizung & Wasser in München",
  rechnerSituation: "renovierung",
  datePublished: "2024-11-01",
  dateModified: "2025-01-15",
};

export const badRenovierenAblauf: RatgeberData = {
  slug: "bad-renovieren-ablauf",
  titel: "Bad renovieren Ablauf",
  metaTitle: "Bad renovieren Ablauf — Schritte, Handwerker & Zeitplan München",
  metaDescription:
    "Bad renovieren Schritt für Schritt: typischer Ablauf in München, Reihenfolge der Handwerker, Stillstandszeiten und worauf du bei Altbau & WEG achten musst.",
  hero: {
    headline: "Bad renovieren — wie läuft das ab und wie lange dauert es?",
    subline:
      "Schritt für Schritt erklärt — vom ersten Termin bis zum fertigen Bad, damit du weißt was auf dich zukommt.",
  },
  wannBrauche: {
    title: "Wann brauchst du einen klaren Fahrplan?",
    punkte: [
      "Komplettsanierung mit Leitungswechsel",
      "Nur ein Bad im Objekt",
      "WEG mit Ruhezeiten und Wasserabsperrung",
      "Umbau von Wanne zu ebenerdig",
      "Statik bei Wandöffnung",
      "Paralleltermin mit Küche",
    ],
  },
  ablauf: [
    { schritt: "Planung & 3D", text: "Layout, Positionen für Wasser und Abfluss, Licht, Lüftung." },
    { schritt: "Rohbau", text: "Demontage, Estrich, Leitungen, Dämmung." },
    { schritt: "Installationsvorbereitung", text: "Elektro, Vorwand für Armaturen, Unterputzarmaturen." },
    { schritt: "Fliesenarbeit", text: "Dichtbereich, Gefälle, große Platten." },
    { schritt: "Installation", text: "Wasseranschlüsse, Glas, Armaturen, Spiegel." },
    { schritt: "Abschluss", text: "Maler, Silikon, Reinigung, gemeinsame Kontrolle am Ende." },
  ],
  voraussetzungen: [
    "Zwischenbad oder Hotel einplanen bei Komplett",
    "Material früh bestellen (Lieferzeiten Fliesen)",
    "Wasserabsperrung mit Nachbarn abstimmen",
    "Entsorgung über Container/Hof",
    "Statik bei tragenden Wänden",
  ],
  materialien: [
    { name: "Dichtsystem", beschreibung: "Folie, Manschetten, Anschlüsse.", vonBis: "600–1.400 €", fuer: "Duschbereich" },
    { name: "Großformat", beschreibung: "Wenig Fugen, modern.", vonBis: "Material +30–50 %", fuer: "Designbäder" },
    { name: "Lüftung", beschreibung: "Kleinraumlüfter nachlüften.", vonBis: "350–900 €", fuer: "Innenbäder ohne Fenster" },
    { name: "Estrich schnell", beschreibung: "Schnellzement für kurze Stillstand.", vonBis: "Aufpreis 400–1.200 €", fuer: "Zeitkritisch" },
  ],
  kosten: {
    einheit: "Komplettbad 6–8 m² typisch",
    von: 12000,
    bis: 22000,
    faktoren: [
      "Umfang Leitungen",
      "Statik/Öffnungen",
      "Fliesenformat",
      "Lüftung",
      "Armaturenlinie",
      "München: Logistik & Parken",
    ],
    beispiel:
      "6 m², ebenerdig, Standardfliesen, neue Armaturen, Lüftung: ca. 15.000 – 19.000 €.",
  },
  zeitaufwand: {
    klein: "3–7 Tage (Teil)",
    mittel: "2–3 Wochen",
    gross: "4–6 Wochen",
    faktoren: [
      "Estrichtrocknung",
      "Sonderfliesen",
      "WEG-Ruhezeiten",
    ],
  },
  koordination:
    "Bärenwald setzt einen Masterterminplan — jeder Handwerker bekommt klare Schnittstellen, damit Silikon und Maler nicht zu früh kommen.",
  koordinationUsps: [
    "Stillstandsminimierung",
    "Täglicher Status",
    "Gemeinsame Kontrolle am Ende mit Liste",
  ],
  faq: [
    { q: "Wie lange ohne Dusche?", a: "Bei Komplett oft 1–2 Wochen kritisch — wir planen Übergang." },
    { q: "Kann ich Teile behalten?", a: "Ja, wenn technisch sinnvoll — dann früher festlegen." },
    { q: "Wer baut Küche mit um?", a: "Separater Strang — wir vermeiden Schnittstellenkonflikte." },
    { q: "Fliesen zuerst oder Armaturen?", a: "Rohinstallation, dann Fliesen, dann Abschluss mit WC, Dusche und Waschtisch." },
    { q: "Was ist mit Versicherung?", a: "Elementar/Schäden — Fotos vor Start." },
    { q: "Kann ich währenddessen streichen?", a: "Nur nach Abschluss feuchter Arbeiten und Kontrolle des Dichtbereichs." },
  ],
  qualitaet: [
    "Dichtbereich doppelt geprüft",
    "Gefälle sichtbar geprüft",
    "Silikonfugen sauber gezogen",
    "Armaturen ohne Kalkleckage nach 48h Test",
    "Lüftungsleistung spürbar",
  ],
  muenchen: [
    "🏢 WEG in Milbertshofen: oft nur Wochenendsperre Wasser möglich",
    "🏚️ Altbau: unplombierte Leitungen — Puffer einplanen",
    "🚚 Hofeinfahrt eng — Material in Etappen",
  ],
  leistungsSlug: "badezimmer-sanierung",
  leistungsLabel: "Badezimmer sanieren in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const fensterTauschenKosten: RatgeberData = {
  slug: "fenster-tauschen-kosten",
  titel: "Fenster tauschen Kosten",
  metaTitle: "Fenster tauschen München — Kosten, Förderung & Ablauf 2025",
  metaDescription:
    "Was kostet Fenstertausch in München? Preise pro Fenster, U-Wert, Förderung, Altbau-Anschlüsse und typische Zusatzkosten Außenputz.",
  hero: {
    headline: "Neue Fenster — was kostet das und lohnt es sich wirklich?",
    subline:
      "Preise, Förderung und wie viel Heizkosten du wirklich sparst — ehrlich erklärt.",
  },
  wannBrauche: {
    title: "Wann lohnt sich ein Tausch?",
    punkte: [
      "Zugluft, Kondenswasser innen, undichte Rahmen",
      "Schallschutz verbessern (Fluglärm, Straße)",
      "Einbruchschutz erhöhen RC-Klasse",
      "Heizkosten senken (U-Wert < 1,0)",
      "Rollladenmotor defekt / Sanierung",
      "Verkauf oder energetische Sanierung",
    ],
  },
  ablauf: [
    { schritt: "Ausmessen vor Ort", text: "Bestandsfenster, Anschlüsse, Rollladenkasten prüfen." },
    { schritt: "Angebot", text: "Holz/Alu/Kunststoff, Verglasung, Montage inkl. Abdichtung." },
    { schritt: "Bestellung", text: "Lieferzeit 6–12 Wochen typisch." },
    { schritt: "Demontage", text: "Schonend, Schutz innen, Außenputz vorbereiten." },
    { schritt: "Montage", text: "Rahmen, Dämmung, Anschlussfolie, Dampfbremse." },
    { schritt: "Abschluss", text: "Innen: Fensterbank; Außen: Putz/Sturz." },
  ],
  voraussetzungen: [
    "Gerüst bei Obergeschoss prüfen",
    "Denkmalschutz klären",
    "Rollladenkasten-Dämmung optional",
    "Farbe Außenputz abstimmen",
    "Zugang Wohnung / Gerüstbescheid",
  ],
  materialien: [
    { name: "Kunststoff 3-fach", beschreibung: "Standard, pflegeleicht.", vonBis: "450–900 €/Fenster", fuer: "Wohnungen" },
    { name: "Holz-Alu", beschreibung: "Hochwertig, langlebig.", vonBis: "900–1.600 €/Fenster", fuer: "Denkmal/Design" },
    { name: "Schallschutzverglasung", beschreibung: "Spezialglas dick.", vonBis: "+180–420 €/Fenster", fuer: "Lärmstraßen" },
    { name: "Rollladen-Elektro", beschreibung: "Motor nachrüsten.", vonBis: "380–950 €", fuer: "Komfort" },
  ],
  kosten: {
    einheit: "pro Fenster inkl. Einbau (Standardgröße)",
    von: 450,
    bis: 1400,
    faktoren: [
      "Größe und Sonderform",
      "Gerüst/Hebebühne",
      "Außenputz/Sturz",
      "Schallschutz",
      "Rollladenkasten",
      "München Innenstadt: Logistik",
    ],
    beispiel:
      "8 Fenster Kunststoff 3-fach, Mittelklasse, ohne Gerüst EG: ca. 6.500 – 9.500 €; mit Außenputz +1.500–3.500 €.",
  },
  zeitaufwand: {
    klein: "1 Tag (2–3 Fenster)",
    mittel: "2–3 Tage",
    gross: "4–7 Tage",
    faktoren: [
      "Putztrocknung",
      "Sonderglas Lieferzeit",
      "Wetter Außenarbeit",
    ],
  },
  koordination:
    "Wir koordinieren Fenster mit Maler und Dämmung — Außenputz und Innenabschluss im gleichen Zeitfenster.",
  koordinationUsps: [
    "Ausmessen und Montage aus einem Team",
    "Fördercheck",
    "Gemeinsame Kontrolle der Dichtheit",
  ],
  faq: [
    { q: "Förderung?", a: "Energetische Sanierung oft förderfähig — U-Wert beachten, Antrag vor Start." },
    { q: "Wie lange pro Fenster?", a: "2–3 Stunden bei Standard." },
    { q: "Muss Außenputz?", a: "Häufig ja am Anschluss — im Angebot separat ausweisen." },
    { q: "Schallschutz Innenstadt?", a: "Spezialglas + richtige Montagefuge — messbar besser." },
    { q: "Rollladen behalten?", a: "Oft Sanierung oder Neubefüllung Kasten möglich." },
    { q: "Winter möglich?", a: "Ja mit Schutz und kurzen Öffnungszeiten — Plan B Heizung." },
  ],
  qualitaet: [
    "Anschlussfolie stimmig",
    "Keine Kondensstreifen an Rahmen",
    "Schließende Funktion über alle Zyklen",
    "Putz Übergang ohne Risse",
    "Schallschutz wie spezifiziert",
  ],
  muenchen: [
    "✈️ Fluglärmrouten Riem/Moosach: Schallschutzglas lohnt sich schnell",
    "🏛️ Denkmal Altstadt: Holzprofile und Genehmigungen",
    "🅿️ Gerüstgenehmigung öffentlich: Fristen mit Stadt einplanen",
  ],
  leistungsSlug: "fenster-tueren",
  leistungsLabel: "Fenster & Türen München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const trockenbauKostenMuenchen: RatgeberData = {
  slug: "trockenbau-kosten-muenchen",
  titel: "Neue Wände & Decken — Kosten München",
  metaTitle: "Neue Wände & Decken München — Kosten pro m², Schall & Ablauf 2025",
  metaDescription:
    "Neue Wände und Decken in München: Preise pro m² für Trennwände, abgehängte Decken, Dämmung, Schallschutz und typische Altbausituationen mit hohen Decken.",
  hero: {
    headline: "Neue Wand einziehen — was kostet das in München?",
    subline:
      "Zimmer teilen, Nische bauen, Decke abhängen — Preise und wie lange es dauert.",
  },
  wannBrauche: {
    title: "Wann lohnt sich eine neue Wand oder Decke ohne nassen Beton?",
    punkte: [
      "Raumaufteilung ohne nasse Wände",
      "Decken abhängen für Rohrleitungen/Licht",
      "Schallschutz zwischen Wohnungen",
      "Vorwandinstallation Bad",
      "Nischen und Einbauten",
      "Kernsanierung mit schneller Hülle",
    ],
  },
  ablauf: [
    { schritt: "Planung", text: "Statik prüfen, Leitungsführung, Brandschutz." },
    { schritt: "Gestell", text: "CW-Profile, Abstand, Dämmung." },
    { schritt: "Beplankung", text: "Einfach/doppelt je Schall." },
    { schritt: "Spachtel", text: "Flächen glatt für Maler." },
    { schritt: "Übergänge", text: "Sockel, Türen, Deckenanschluss." },
    { schritt: "Gemeinsame Kontrolle am Ende", text: "Schallkurztest optional." },
  ],
  voraussetzungen: [
    "Leitungswege vorab markiert",
    "Brandabschnitte nach Vorschrift",
    "Zugang Material (Aufzug/Hof)",
    "Staubschutz Nachbarn",
    "Deckenhöhe für Brandschutzplatten",
  ],
  materialien: [
    { name: "Einfachbeplankung", beschreibung: "Leichte Trennwand.", vonBis: "45–65 €/m²", fuer: "Nichträume" },
    { name: "Doppelbeplankung", beschreibung: "Besserer Schall.", vonBis: "70–95 €/m²", fuer: "Wohnungstrennung" },
    { name: "Akustikdämmung", beschreibung: "Mineralwolle höhere Rohdichte.", vonBis: "+8–18 €/m²", fuer: "Schlafzimmer an Straße" },
    { name: "Feuchtraumplatten", beschreibung: "Grüne Platten Bad.", vonBis: "+12–22 €/m²", fuer: "Nasszellen" },
  ],
  kosten: {
    einheit: "pro m² Wandfläche inkl. Standard",
    von: 45,
    bis: 95,
    faktoren: [
      "Schallschutzklasse",
      "Brandanforderungen",
      "Deckenhöhe >2,80 m",
      "Einbauten/Nischen",
      "Leitungsfüllung",
      "München: hohe Decken Gründerzeit",
    ],
    beispiel:
      "12 m Trennwand doppelbeplankt mit Dämmung, Türöffnung: ca. 2.800 – 4.200 €.",
  },
  zeitaufwand: {
    klein: "1–2 Tage",
    mittel: "3–5 Tage",
    gross: "1–2 Wochen",
    faktoren: [
      "Trocknungszeit Spachtel",
      "Mehrere Schichten",
      "Koordination Maler",
    ],
  },
  koordination:
    "Wir stimmen neue Wände und Decken (Trockenbau) mit Elektro und Wasserleitungen ab — Bohrungen und Steckdosen an der richtigen Stelle.",
  koordinationUsps: [
    "Schall- und Brandschutz-Check",
    "Festpreis je Raum",
    "Saubere Staubtür",
  ],
  faq: [
    { q: "Wie dicht ist schalltechnisch?", a: "Mit Doppelbeplankung und Mineralwolle oft 45–52 dB — je nach Detail." },
    { q: "Tragende Wand?", a: "Nein — nur nichttragende Trennwände ohne Statik-Freigabe." },
    { q: "TV-Wand?", a: "Verstärkung im Studiowand integrierbar." },
    { q: "Feuchtraum?", a: "Spezialplatten und Dichtband an Übergängen." },
    { q: "Decke abhängen für LED?", a: "Ja — Leitungen und Treiber planen." },
    { q: "Was kostet nur Decke?", a: "Oft 40–85 €/m² je nach Höhe und Dämmung." },
  ],
  qualitaet: [
    "Gerade Flächen ohne Sichtwellen",
    "Fugen verspachtelt rasterfrei",
    "Schrauben versenkt korrekt",
    "Brandschutzplatten wo nötig",
    "Staub reduziert durch Absaugung",
  ],
  muenchen: [
    "📐 Decken 3,2 m in Haidhausen: mehr Fläche, Gerüst innen",
    "🏚️ Altbau Decken uneben — Ausgleichsschichten nötig",
    "🔇 Mietschutz: Schallmessung bei kritischen Nachbarn empfohlen",
  ],
  leistungsSlug: "trockenbau",
  leistungsLabel: "Neue Wände & Decken in München",
  rechnerSituation: "renovierung",
  ...DATES_STD,
};

export const dacharbeitenKostenMuenchen: RatgeberData = {
  slug: "dacharbeiten-kosten-muenchen",
  titel: "Dacharbeiten Kosten München",
  metaTitle: "Dacharbeiten München — Kosten, Sanierung & Notfall 2025",
  metaDescription:
    "Was kosten Dacharbeiten in München? Preise pro m², Reparatur vs. Sanierung, Sturm & Versicherung und typische Zusatzkosten bei Satteldächern.",
  hero: {
    headline: "Dach reparieren oder sanieren — was kostet das in München?",
    subline:
      "Von der kleinen Reparatur bis zur Komplettsanierung — echte Preise und wann du handeln musst.",
  },
  wannBrauche: {
    title: "Wann musst du handeln?",
    punkte: [
      "Ziegel locker oder First beschädigt",
      "Feuchteflecken im Dachgeschoss",
      "Moos/Pilz auf der Dachhaut",
      "Dachfenster undicht",
      "Rinne verstopft / undicht",
      "Sturmschaden akut",
    ],
  },
  ablauf: [
    { schritt: "Inspektion", text: "Fotos, Zugang, Arbeitssicherung." },
    { schritt: "Angebot", text: "Reparatur vs. Teilsanierung klar trennen." },
    { schritt: "Gerüst/Sicherung", text: "Fangnetz, Absturzsicherung." },
    { schritt: "Ausführung", text: "Ziegel, Unterspannbahn, Dämmung teilweise." },
    { schritt: "Dachfenster", text: "Eindecken, Anschlussbleche." },
    { schritt: "Gemeinsame Kontrolle am Ende", text: "Regentest, Bilddoku für Versicherung." },
  ],
  voraussetzungen: [
    "Zugang Dachboden frei",
    "Gerüst Genehmigung ggf. öffentlich",
    "Wetterfenster einplanen",
    "Versicherung bei Sturm prüfen",
    "Nachbarrecht Abfangen",
  ],
  materialien: [
    { name: "Betondachstein", beschreibung: "Langlebig, Standard.", vonBis: "80–130 €/m²", fuer: "Sanierung komplett" },
    { name: "Kleine Reparatur", beschreibung: "Teilziegel, First, Klemmer.", vonBis: "250–800 €", fuer: "Lokal" },
    { name: "Unterspannbahn neu", beschreibung: "Diffusionsoffen.", vonBis: "25–45 €/m²", fuer: "Sanierung" },
    { name: "Dachfenster Velux", beschreibung: "Komplettset.", vonBis: "900–2.400 €", fuer: "Ausbau & Einbau" },
  ],
  kosten: {
    einheit: "Komplettsanierung pro m² Dachfläche Richtwert",
    von: 80,
    bis: 180,
    faktoren: [
      "Dachneigung und Zugänglichkeit",
      "Gerüstkosten",
      "Dämmung Dachboden",
      "Ziegelart und Ort",
      "Dachfensteranzahl",
      "München: enge Grundstücke, Gerüst teuer",
    ],
    beispiel:
      "Satteldach 120 m², neue Unterspannbahn, Teilziegel, Dämmung 12 cm: ca. 14.000 – 22.000 €.",
  },
  zeitaufwand: {
    klein: "0,5–1 Tag",
    mittel: "2–4 Tage",
    gross: "1–3 Wochen",
    faktoren: [
      "Wetter",
      "Gerüstbau",
      "Sonderziegel Lieferzeit",
    ],
  },
  koordination:
    "Wir verbinden Dachdecker mit Gerüstbau und ggf. Solar — ein Zeitfenster, weniger Stillstand.",
  koordinationUsps: [
    "Notdokumentation Sturm",
    "Versicherungsfreundliche Fotos",
    "Festpreis nach Ausmessen vor Ort",
  ],
  faq: [
    { q: "Zahlt Versicherung Sturm?", a: "Ab Windstärke 8 oft ja — Fotos und Wetterbericht sichern." },
    { q: "Wie schnell Notabdichtung?", a: "Oft am selben Tag Plane/Provisorium möglich." },
    { q: "Darf ich selbst aufs Dach?", a: "Lebensgefahr — nur Fachfirma mit Absturzsicherung." },
    { q: "Solar gleich mit?", a: "Statik und Eindeckung abstimmen — oft sinnvoll." },
    { q: "Wie oft inspizieren?", a: "Alle 5–10 Jahre sichtkontrolle, nach großen Stürmen sofort." },
    { q: "Was kostet nur Rinne?", a: "Teilstück oft 350–1.200 € je nach Zugang." },
  ],
  qualitaet: [
    "Saubere Eindeckung ohne Überdeck",
    "First und Ortgang dicht",
    "Lüftung Dachraum gewährleistet",
    "Schneelastfähige Konstruktion",
    "Fotodokumentation",
  ],
  muenchen: [
    "❄️ Schneelast & Tauwetter: Rinne und Eindeckung kritisch in Bogenhausen-Loftdächern",
    "🏠 Reihenhaus: Mittelwandanschlüsse dicht setzen",
    "🪜 Enge Hinterhöfe: Kran nur selten — Handarbeit + kleines Gerüst",
  ],
  leistungsSlug: "dacharbeiten",
  leistungsLabel: "Dacharbeiten München",
  rechnerSituation: "akut",
  ...DATES_STD,
};
