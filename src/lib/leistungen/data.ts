import type { LeistungsData } from "@/lib/leistungen/types";

export type { LeistungsData } from "@/lib/leistungen/types";

function vorteil(
  a: [string, string],
  b: [string, string],
  c: [string, string],
  d: [string, string]
): LeistungsData["vorteile"] {
  return [
    { icon: a[0], text: a[1] },
    { icon: b[0], text: b[1] },
    { icon: c[0], text: c[1] },
    { icon: d[0], text: d[1] },
  ];
}

export const LEISTUNGEN_DATA: Record<string, LeistungsData> = {
  malerarbeiten: {
    slug: "malerarbeiten",
    label: "Streichen & Tapezieren",
    headline: "Streichen & Tapezieren in München —\nfrisch und sauber",
    subline:
      "Wände, Decken, frischer Anstrich. Ein Termin, ein Ansprechpartner — wir messen alles aus und nennen dir einen klaren Preis.",
    beschreibung:
      "Frisch gestrichene Wände machen den größten Unterschied. Wir streichen, tapezieren und spachteln — sauber, gleichmäßig und ohne Flecken auf deinem Boden. Du kommst zurück und die Wohnung sieht aus wie neu.",
    wasWirMachen: [
      "Wände und Decken frisch streichen",
      "Alte Tapeten entfernen und neu tapezieren",
      "Löcher und Risse schließen und glätten",
      "Türen und Fensterrahmen lackieren",
      "Böden und Möbel vollständig abdecken",
      "Alles aufräumen und Farbreste entsorgen",
    ],
    preisVon: 12,
    preisBis: 22,
    preisEinheit: "pro m² Wandfläche",
    preisHinweis:
      "Der Preis hängt davon ab wie groß die Fläche ist und ob die Wände in gutem Zustand sind. Beim Vor-Ort-Termin sehen wir uns alles an und nennen dir einen festen Preis. Anfahrt wird bei Beauftragung angerechnet.",
    vorteile: vorteil(
      ["🎯", "Ein Ansprechpartner für alles"],
      ["✓", "Geprüfte Meisterbetriebe"],
      ["⏱", "Termintreue & saubere Baustelle"],
      ["💶", "Transparente Festpreise"]
    ),
    ratgeberSlug: "malerarbeiten-kosten-muenchen",
    ratgeberLabel: "Was kosten Malerarbeiten in München?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Muss ich die Wohnung räumen?",
        a: "Nicht komplett. Möbel zur Raummitte schieben reicht in den meisten Fällen. Bei großen Umbauten empfehlen wir leere Räume — das geht schneller und günstiger.",
      },
      {
        q: "Wie lange dauert das Streichen einer Wohnung?",
        a: "Eine 3-Zimmer-Wohnung (ca. 70 m²) dauert 2–3 Tage. Größere Wohnungen oder aufwendigere Materialien entsprechend länger.",
      },
      {
        q: "Welche Farben werden verwendet?",
        a: "Wir arbeiten mit hochwertigen Markenfarben — Caparol, Alpina oder nach deinem Wunsch. Wir beraten dich gern bei der Auswahl.",
      },
      {
        q: "Kann ich die Farbe selbst auswählen?",
        a: "Ja, absolut. Du kannst Farbton und Hersteller selbst wählen oder wir beraten dich vor Ort.",
      },
      {
        q: "Wird der Boden geschützt?",
        a: "Selbstverständlich. Böden und Möbel werden vollständig abgedeckt bevor die Arbeiten beginnen.",
      },
    ],
  },

  "badezimmer-sanierung": {
    slug: "badezimmer-sanierung",
    label: "Neues Bad",
    headline: "Neues Bad in München —\naus einer Hand geplant",
    subline:
      "Bad modernisieren oder komplett neu. Wir kümmern uns um Planung, Termine und alle Handwerker — du hast nur einen Ansprechpartner.",
    beschreibung:
      "Ein neues Bad braucht mehrere Handwerker — jemand für die Fliesen, jemand für die Leitungen, jemand für den Strom. Das kostet normalerweise viel Nerven beim Koordinieren. Bei uns gibt es nur einen Ansprechpartner. Wir kümmern uns um alles.",
    wasWirMachen: [
      "Altes Bad komplett ausbauen und entsorgen",
      "Neue Dusche, Badewanne oder WC einbauen",
      "Fliesen verlegen — Boden und Wände",
      "Wasserleitungen und Abflüsse verlegen",
      "Licht und Steckdosen installieren",
      "Lüftung einbauen oder erneuern",
    ],
    preisVon: 6500,
    preisBis: 20000,
    preisEinheit: "pauschal je nach Umfang",
    preisHinweis:
      "Ein kleines Bad auffrischen kostet ab 6.500 €. Ein komplett neues Bad ab 10.000 €. Beim Termin schauen wir was wirklich nötig ist — und was sich lohnt.",
    vorteile: vorteil(
      ["🔧", "Alle Schritte aus einer Hand"],
      ["📐", "Durchdachte Planung vor dem Start"],
      ["🛡", "Festpreis nach Vor-Ort-Termin"],
      ["⏱", "Realistische Zeitplanung"]
    ),
    ratgeberSlug: "bad-sanierung-kosten-muenchen",
    ratgeberLabel: "Was kostet eine Badsanierung in München?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Wie lange dauert eine Badsanierung?",
        a: "Eine Komplettsanierung dauert 2–3 Wochen. Teilsanierungen (nur Fliesen, nur Wasserinstallation) 3–7 Tage. Wir planen so dass du nicht zu lange ohne Bad bist.",
      },
      {
        q: "Können wir während der Sanierung in der Wohnung bleiben?",
        a: "Bei Komplettsanierungen ist das schwierig da für mehrere Tage kein Bad nutzbar ist. Wir sprechen das im Vorfeld mit dir ab.",
      },
      {
        q: "Gibt es Förderungen für barrierefreie Bäder?",
        a: "Ja — die KfW fördert altersgerechten Umbau mit Zuschüssen bis 6.250 €. Wir informieren dich bei Bedarf.",
      },
      {
        q: "Was ist im Festpreis enthalten?",
        a: "Alle vereinbarten Leistungen, Material (sofern vereinbart), Entsorgung und die Koordination durch Bärenwald. Keine versteckten Kosten.",
      },
    ],
  },

  bodenbelag: {
    slug: "bodenbelag",
    label: "Neuer Boden",
    headline: "Neuer Boden in München",
    subline:
      "Laminat, Parkett, Fliesen oder Vinyl — wir beraten und verlegen fachgerecht.",
    beschreibung:
      "Neuer Boden verändert ein Zimmer komplett. Wir beraten welches Material zu dir passt, bereiten den Untergrund vor und verlegen fachgerecht — von der ersten Leiste bis zur letzten Sockelleiste.",
    wasWirMachen: [
      "Alten Boden entfernen und entsorgen",
      "Untergrund vorbereiten und ausgleichen",
      "Neuen Boden verlegen — Laminat, Parkett, Fliesen oder Vinyl",
      "Trittschalldämmung einbauen",
      "Sockelleisten und Übergänge montieren",
      "Zimmer wieder begehbar hinterlassen",
    ],
    preisVon: 35,
    preisBis: 140,
    preisEinheit: "pro m² je nach Material",
    preisHinweis:
      "Laminat kostet weniger, Parkett mehr — wir zeigen dir den Unterschied und was sich für deine Situation lohnt. Preis immer pro m² inkl. Verlegung.",
    vorteile: vorteil(
      ["🪵", "Materialberatung vor Ort"],
      ["🔊", "Trittschall & Untergrund richtig"],
      ["✓", "Saubere Kanten & Übergänge"],
      ["🚚", "Altbelag fachgerecht entsorgt"]
    ),
    ratgeberSlug: "bodenbelag-kosten-muenchen",
    ratgeberLabel: "Was kostet neuer Boden in München?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Welcher Boden ist der richtige für mich?",
        a: "Laminat ist günstig und pflegeleicht, ideal für Wohn- und Schlafzimmer. Parkett ist langlebiger und aufwertend. Vinyl ist wasserfest für Küche und Bad. Fliesen sind dauerhaft und robust.",
      },
      {
        q: "Muss der alte Boden raus?",
        a: "Nicht immer. Laminat und Vinyl kann oft drübergelegt werden wenn der Untergrund eben ist. Wir prüfen das beim Vor-Ort-Termin.",
      },
      {
        q: "Wie lange dauert das Verlegen?",
        a: "Pro Raum (ca. 20 m²) ca. 1 Tag. Eine 3-Zimmer-Wohnung in 3–4 Tagen.",
      },
    ],
  },

  elektroarbeiten: {
    slug: "elektroarbeiten",
    label: "Strom & Licht",
    headline: "Strom & Licht in München —\nsicher und zertifiziert",
    subline:
      "Nur durch zugelassene Elektrofachbetriebe. Von der einzelnen Steckdose bis zum Sicherungskasten.",
    beschreibung:
      "Zu wenig Steckdosen, schlechtes Licht, alter Sicherungskasten — das kennt jeder. Elektroarbeiten dürfen nur vom Fachbetrieb gemacht werden. Unsere Elektriker sind zertifiziert und erledigen alles sicher und sauber.",
    wasWirMachen: [
      "Neue Steckdosen und Lichtschalter einbauen",
      "Licht installieren — Einbaustrahler, Pendelleuchten, Außenlicht",
      "Alten Sicherungskasten modernisieren",
      "Ladestation fürs E-Auto einbauen",
      "Smarthome vorbereiten",
      "Alle Arbeiten dokumentiert und zur gemeinsamen Kontrolle am Ende bereit",
    ],
    preisVon: 85,
    preisBis: 140,
    preisEinheit: "pro Punkt (Steckdose/Licht)",
    preisHinweis:
      "Eine neue Steckdose kostet 85–140 €. Den gesamten Sicherungskasten erneuern 800–2.500 €. Eine Ladestation fürs E-Auto 1.200–2.500 € komplett eingebaut.",
    vorteile: vorteil(
      ["⚡", "Nur zugelassene Fachbetriebe"],
      ["📋", "Dokumentation & Prüfprotokoll"],
      ["🏠", "Abgestimmt mit Maler und Boden"],
      ["🔌", "Wallbox & Zukunftstechnik"]
    ),
    ratgeberSlug: "elektroarbeiten-kosten-muenchen",
    ratgeberLabel: "Was kosten Elektroarbeiten in München?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Kann ich Elektroarbeiten selbst durchführen?",
        a: "Nein — in Deutschland sind Elektroarbeiten am Netz nur durch zugelassene Elektrofachbetriebe erlaubt. Pfusch kann zur Lebensgefahr und zum Verlust des Versicherungsschutzes führen.",
      },
      {
        q: "Gibt es Förderung für die Wallbox?",
        a: "Ja — viele Energieversorger und Bundesländer fördern Wallboxen. Wir informieren dich über aktuelle Programme.",
      },
    ],
  },

  "heizung-sanitaer": {
    slug: "heizung-sanitaer",
    label: "Heizung & Wasser",
    headline: "Heizung & Wasser in München —\nWartung und Erneuerung",
    subline:
      "Heizung tauschen, Rohre reparieren, Warmwasser — zuverlässig und schnell.",
    beschreibung:
      "Heizung aus, kein warmes Wasser, Rohr undicht — das sind Situationen die sofort gelöst werden müssen. Wir reparieren, warten und tauschen Heizungen und Wasserleitungen in ganz München.",
    wasWirMachen: [
      "Heizung reparieren oder komplett tauschen",
      "Alte Heizung gegen Wärmepumpe ersetzen",
      "Heizkörper versetzen oder austauschen",
      "Undichte Rohre reparieren",
      "Warmwasserboiler erneuern",
      "Notfallservice — auch kurzfristig",
    ],
    preisVon: 8000,
    preisBis: 22000,
    preisEinheit: "für Heizungstausch pauschal",
    preisHinweis:
      "Wartung und kleine Reparaturen ab 180 €. Heizung komplett tauschen ab 8.000 €. Wärmepumpe wird mit bis zu 70% gefördert — wir helfen beim Antrag.",
    vorteile: vorteil(
      ["🔥", "Schnelle Hilfe bei Ausfällen"],
      ["♻", "Modernisierung & Förderung"],
      ["🛠", "Heizung & Wasser kombiniert"],
      ["📞", "Ein Ansprechpartner"]
    ),
    ratgeberSlug: "heizung-tauschen-kosten",
    ratgeberLabel: "Heizung tauschen — Kosten & Förderung 2025",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Wann lohnt sich ein Heizungstausch?",
        a: "Ab einem Alter von 15–20 Jahren ist ein Tausch meist wirtschaftlicher als weitere Reparaturen. Moderne Anlagen sparen 30–50% Heizkosten.",
      },
      {
        q: "Wie hoch ist die Förderung für eine Wärmepumpe?",
        a: "Bis zu 70% der Investitionskosten durch BAFA und KfW — je nach Einkommenssituation und Gebäudezustand. Wir helfen beim Förderantrag.",
      },
    ],
  },

  gartenpflege: {
    slug: "gartenpflege",
    label: "Gartenpflege",
    headline: "Gartenpflege in München —\nregelmäßig und zuverlässig",
    subline:
      "Mähen, Schneiden, Aufräumen. Wir kümmern uns regelmäßig damit dein Garten immer gut aussieht.",
    beschreibung:
      "Regelmäßige Pflege hält den Garten in Schuss — ohne dass du jeden Samstag selbst mähen musst. Wir kommen wöchentlich, zweiwöchentlich oder monatlich und halten alles ordentlich.",
    wasWirMachen: [
      "Rasen mähen und Kanten schneiden",
      "Hecken und Sträucher in Form halten",
      "Beete von Unkraut befreien",
      "Laub und Schnittgut mitnehmen",
      "Beete und Pflanzen gießen wenn nötig",
      "Frühjahrs- und Herbstschnitt",
    ],
    preisVon: 2.2,
    preisBis: 3.8,
    preisEinheit: "pro m² pro Monat",
    preisHinweis:
      "Ein kleiner Stadtgarten kostet ab 220 € pro Monat bei zweiwöchentlicher Pflege. Beim ersten Termin schauen wir uns alles an und machen dir ein individuelles Angebot.",
    vorteile: vorteil(
      ["🌿", "Fester Rhythmus, weniger Stress"],
      ["📅", "Flexibel wöchentlich oder monatlich"],
      ["♻", "Entsorgung inklusive"],
      ["🏡", "München & Umgebung"]
    ),
    ratgeberSlug: "gartenpflege-kosten-muenchen",
    ratgeberLabel: "Was kostet Gartenpflege in München?",
    rechnerSituation: "pflege",
    faq: [
      {
        q: "Wann ist die beste Zeit für den ersten Schnitt?",
        a: "In München ab Mitte April wenn kein Frost mehr zu erwarten ist. Hecken idealerweise vor dem 15. März oder nach dem 15. September (Brutschutz § 39 BNatSchG).",
      },
      {
        q: "Brauche ich einen Vertrag?",
        a: "Nein — wir bieten auch Einzeleinsätze an. Ein Abo ist günstiger und gibt dir Planungssicherheit.",
      },
    ],
  },

  gartengestaltung: {
    slug: "gartengestaltung",
    label: "Garten neu gestalten",
    headline: "Garten neu gestalten in München",
    subline:
      "Terrasse, Wege, Bepflanzung — von der Idee bis zur fertigen Fläche.",
    beschreibung:
      "Verwilderter Garten, alte Terrasse, keine Struktur — wir planen und gestalten neu. Von der Idee bis zum fertigen Garten, alles aus einer Hand.",
    wasWirMachen: [
      "Garten planen und gemeinsam gestalten",
      "Terrasse aus Holz, Stein oder WPC bauen",
      "Wege anlegen und pflastern",
      "Neue Pflanzen setzen und Rasen anlegen",
      "Zaun oder Sichtschutz aufbauen",
      "Bewässerung einbauen wenn gewünscht",
    ],
    preisVon: 90,
    preisBis: 175,
    preisEinheit: "pro m² je nach Umfang",
    preisHinweis:
      "Einfache Neugestaltung ab 90 €/m². Terrasse aus Naturstein ab 120 €/m². Beim ersten Gespräch entwickeln wir gemeinsam eine Idee die zu deinem Budget passt.",
    vorteile: vorteil(
      ["🌳", "Planung & Umsetzung aus einer Hand"],
      ["🪨", "Terrasse & Wege fachgerecht"],
      ["💧", "Bewässerung nach Bedarf"],
      ["🎯", "Transparente Kostenrahmen"]
    ),
    ratgeberSlug: "gartengestaltung-kosten-muenchen",
    ratgeberLabel: "Was kostet Gartengestaltung in München?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Brauche ich eine Genehmigung?",
        a: "Für Terrassen und Wege meist nicht. Für Zäune und größere Bauten je nach Gemeinde. Wir prüfen das für dich.",
      },
    ],
  },

  winterdienst: {
    slug: "winterdienst",
    label: "Winterdienst",
    headline: "Winterdienst München —\nzuverlässig und haftungssicher",
    subline:
      "Räumen und Streuen wenn es drauf ankommt. Wir übernehmen deine Streupflicht.",
    beschreibung:
      "In München musst du als Hauseigentümer oder Mieter (wenn im Mietvertrag so vereinbart) den Gehweg räumen und streuen — ab 7 Uhr morgens. Wer das nicht tut haftet persönlich wenn jemand stürzt. Wir übernehmen diese Pflicht vollständig.",
    wasWirMachen: [
      "Gehweg räumen sobald es schneit",
      "Streuen damit niemand ausrutscht",
      "Einfahrt und Parkplatz freihalten",
      "Bereitschaft auch frühmorgens und am Wochenende",
      "Jeden Einsatz dokumentieren — für deine Absicherung",
      "Umweltfreundliches Streumittel nutzen",
    ],
    preisVon: 620,
    preisBis: 1100,
    preisEinheit: "pro Saison",
    preisHinweis:
      "Pro Saison (Oktober bis April) kostet ein normaler Gehweg 620–1.100 €. Einmalig buchen oder als Jahresvertrag — ganz wie du willst.",
    vorteile: vorteil(
      ["❄", "Bereitschaft bei Schneefall"],
      ["📄", "Dokumentation für Nachweise"],
      ["🌱", "Umweltfreundliches Streugut"],
      ["⚖", "Vertragliche Übernahme der Pflicht"]
    ),
    ratgeberSlug: "winterdienst-kosten-muenchen",
    ratgeberLabel: "Winterdienst München — Kosten und Streupflicht",
    rechnerSituation: "pflege",
    faq: [
      {
        q: "Was passiert wenn es morgens schneit und ihr nicht da wart?",
        a: "Wir haben einen Bereitschaftsdienst ab 5 Uhr morgens. Bei starkem Schneefall fahren wir mehrere Runden.",
      },
      {
        q: "Übernehmt ihr die Haftung?",
        a: "Ja — durch unseren Vertrag geht die Streupflicht und damit die Haftung auf Bärenwald über. Wir dokumentieren jeden Einsatz.",
      },
    ],
  },

  hausmeisterservice: {
    slug: "hausmeisterservice",
    label: "Jemand der sich um alles kümmert",
    headline: "Rund ums Haus —\nein fester Ansprechpartner",
    subline:
      "Garten, Reinigung, Winterdienst, kleine Reparaturen — wir kümmern uns regelmäßig um dein Objekt.",
    beschreibung:
      "Ein Ansprechpartner für alles rund ums Haus. Garten, Reinigung, kleine Reparaturen, Winterdienst — wir kümmern uns regelmäßig damit du es nicht musst. Ideal für Eigentümer die keine Zeit haben oder Vermieter die ihr Objekt in Schuss halten wollen.",
    wasWirMachen: [
      "Regelmäßige Kontrollgänge",
      "Garten pflegen und Winterdienst machen",
      "Treppenhaus und Gemeinschaftsflächen reinigen",
      "Kleine Reparaturen direkt erledigen",
      "Mülltonnen raus- und reinstellen",
      "Ansprechpartner für Mieter sein",
    ],
    preisVon: 180,
    preisBis: 480,
    preisEinheit: "pro Monat je nach Objekt",
    preisHinweis:
      "Ab 180 € pro Monat für eine Wohnung mit kleinem Garten. Für größere Objekte schnüren wir ein individuelles Paket. Einfach anrufen und besprechen.",
    vorteile: vorteil(
      ["🏠", "Ein Paket für Haus & Hof"],
      ["📞", "Direkter Ansprechpartner"],
      ["🧹", "Reinigung & Kontrolle"],
      ["🔧", "Kleinreparaturen koordiniert"]
    ),
    ratgeberSlug: "hausmeisterservice-kosten-muenchen",
    ratgeberLabel: "Was kostet Hausmeisterservice in München?",
    rechnerSituation: "b2b",
    faq: [
      {
        q: "Für welche Objekte ist das geeignet?",
        a: "Für Einfamilienhäuser, Mehrfamilienhäuser, WEGs und gewerbliche Objekte. Wir erstellen individuelle Pakete.",
      },
      {
        q: "Was ist bei Urlaub oder Abwesenheit?",
        a: "Wir betreuen das Objekt auch während eurer Abwesenheit — auf Wunsch mit Post-Service und regelmäßigem Foto-Report.",
      },
    ],
  },

  "fenster-tueren": {
    slug: "fenster-tueren",
    label: "Neue Fenster & Türen",
    headline: "Neue Fenster & Türen in München",
    subline:
      "Weniger Zug, weniger Lärm, weniger Heizkosten — wir tauschen und dichten ab.",
    beschreibung:
      "Zugige alte Fenster kosten Heizgeld und lassen Lärm rein. Neue Fenster senken die Heizkosten spürbar und machen es angenehm ruhig. Wir tauschen Fenster und Türen — vom Ausmessen bis zur Abdichtung.",
    wasWirMachen: [
      "Fenster ausmessen und bestellen",
      "Alte Fenster ausbauen",
      "Neue Fenster fachgerecht einbauen",
      "Alles abdichten — kein Zug, kein Lärm",
      "Rollläden oder Jalousien nachrüsten",
      "Haustür oder Innentüren tauschen",
    ],
    preisVon: 450,
    preisBis: 1400,
    preisEinheit: "pro Fenster inkl. Einbau",
    preisHinweis:
      "Ein Standardfenster kostet eingebaut 450–1.400 € je nach Größe. Neue Fenster können über die KfW gefördert werden — wir helfen beim Antrag.",
    vorteile: vorteil(
      ["🪟", "Energie & Schallschutz"],
      ["📏", "Ausmessen & fachgerechter Einbau"],
      ["🏠", "Türen inklusive"],
      ["📋", "Hilfe bei Förderanträgen"]
    ),
    ratgeberSlug: "fenster-tauschen-kosten",
    ratgeberLabel: "Fenster tauschen — Kosten & Ablauf",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Wie lange dauert ein Fenstertausch?",
        a: "Ein Fenster ca. 2–3 Stunden. Eine ganze Wohnung mit 8 Fenstern 1–2 Tage.",
      },
      {
        q: "Gibt es Förderung?",
        a: "Ja — KfW fördert energetische Sanierung. Fenster mit U-Wert unter 0,95 sind förderfähig. Wir helfen beim Antrag.",
      },
    ],
  },

  trockenbau: {
    slug: "trockenbau",
    label: "Neue Wände & Decken",
    headline: "Neue Wände & Decken in München",
    subline:
      "Zimmer teilen, Decke abhängen, Nische bauen — schnell und ohne nassen Beton.",
    beschreibung:
      "Zimmer teilen, Nische bauen, Decke abhängen — das geht schneller und sauberer als du denkst. Kein nasser Beton, keine wochenlange Trocknungszeit. Wir bauen neue Wände und Decken in Trockenbauweise.",
    wasWirMachen: [
      "Neue Trennwände einziehen",
      "Zimmer aufteilen oder verkleinern",
      "Decke abhängen — auch mit indirektem Licht",
      "Nischen und Einbauten bauen",
      "Dämmung für Schallschutz integrieren",
      "Vorwand fürs Bad bauen und Oberfläche glatt übergeben",
    ],
    preisVon: 45,
    preisBis: 90,
    preisEinheit: "pro m² Wandfläche",
    preisHinweis:
      "Eine einfache Trennwand kostet ab 45 €/m². Mit Schallschutz-Dämmung bis 90 €/m². Geht oft in 1–2 Tagen — ohne großen Schmutz.",
    vorteile: vorteil(
      ["🏗", "Schnell & relativ sauber"],
      ["🔇", "Schallschutz nach Plan"],
      ["🚿", "Vorwand fürs Bad & Küche"],
      ["✓", "Meisterbetriebe"]
    ),
    ratgeberSlug: "trockenbau-kosten-muenchen",
    ratgeberLabel: "Neue Wände — was kostet das?",
    rechnerSituation: "renovierung",
    faq: [
      {
        q: "Wie schalldicht sind Trockenwände?",
        a: "Mit Doppelbeplankung und Mineralwolle-Füllung erreichen wir 45–52 dB Schallschutz — ausreichend für die meisten Wohnsituationen.",
      },
    ],
  },

  dacharbeiten: {
    slug: "dacharbeiten",
    label: "Dach & Regenrinnen",
    headline: "Dach & Regenrinnen in München",
    subline:
      "Undichtes Dach, Sturmschaden oder volle Sanierung — wir sind schnell da.",
    beschreibung:
      "Ein undichtes Dach ist ein Notfall — jede Stunde die vergeht kann teurer werden. Wir reparieren schnell und sauber. Von der kleinen Reparatur bis zur kompletten Dachsanierung.",
    wasWirMachen: [
      "Kaputte Dachziegel tauschen",
      "Undichte Stellen abdichten",
      "Sturmschäden reparieren",
      "Dachfenster einbauen",
      "Regenrinnen reparieren oder ersetzen",
      "Dach komplett erneuern und neu decken",
    ],
    preisVon: 80,
    preisBis: 180,
    preisEinheit: "pro m² Dachfläche",
    preisHinweis:
      "Kleine Reparaturen ab 250 € pauschal. Größere Schäden schauen wir uns beim Vor-Ort-Termin an und nennen dir einen festen Preis. Anfahrt wird bei Beauftragung angerechnet. Bei Sturmschäden helfen wir auch bei der Versicherung.",
    vorteile: vorteil(
      ["🏡", "Notfall & schnelle Abdichtung"],
      ["🛡", "Fachbetriebe für alle Dachformen"],
      ["📋", "Schadensdokumentation"],
      ["💶", "Klarer Kostenrahmen nach Termin"]
    ),
    ratgeberSlug: "dacharbeiten-kosten-muenchen",
    ratgeberLabel: "Dacharbeiten Kosten München",
    rechnerSituation: "akut",
    faq: [
      {
        q: "Was tun bei akutem Sturmschaden?",
        a: "Sofort anrufen — wir haben einen Notfalldienst für akute Schäden. Provisorische Abdichtung am gleichen Tag möglich.",
      },
      {
        q: "Übernimmt die Versicherung Sturmschäden?",
        a: "Wohngebäudeversicherungen decken Sturmschäden ab Windstärke 8. Wir helfen bei der Schadensdokumentation.",
      },
    ],
  },
};

export function leistungBaseSlugFromParam(slug: string): string | null {
  if (!slug.endsWith("-muenchen")) return null;
  const base = slug.slice(0, -"-muenchen".length);
  return LEISTUNGEN_DATA[base] ? base : null;
}
