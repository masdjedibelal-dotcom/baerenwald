import { getLeistungRechnerPreset } from "@/lib/funnel/leistung-rechner-preset";
import type { LeistungsData } from "@/lib/leistungen/types";
import { LEISTUNGEN, RATGEBER } from "@/lib/routes";

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
      "Wände, Decken, frischer Anstrich. Ein Termin, ein Ansprechpartner — wir messen alles aus und nennen Ihnen einen klaren Preis.",
    beschreibung:
      "Frisch gestrichene Wände machen den größten Unterschied. Wir streichen, tapezieren und spachteln — sauber, gleichmäßig und ohne Flecken auf Ihrem Boden. Sie kommen zurück und die Wohnung sieht aus wie neu.",
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
      "Der Preis hängt davon ab wie groß die Fläche ist und ob die Wände in gutem Zustand sind. Beim Vor-Ort-Termin sehen wir uns alles an und erstellen Ihnen ein Angebot.",
    vorteile: vorteil(
      ["🎯", "Ein Ansprechpartner für alles"],
      ["✓", "Eigene Gewerke & Fachpartner"],
      ["⏱", "Termintreue & saubere Baustelle"],
      ["💶", "Angebot nach Besichtigung"]
    ),
    ratgeberSlug: "malerarbeiten-kosten-muenchen",
    ratgeberLabel: "Was kosten Malerarbeiten in München?",
    rechnerSituation: "erneuern",
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
        a: "Wir arbeiten mit hochwertigen Markenfarben — Caparol, Alpina oder nach Ihrem Wunsch. Wir beraten Sie gern bei der Auswahl.",
      },
      {
        q: "Kann ich die Farbe selbst auswählen?",
        a: "Ja, absolut. Sie können Farbton und Hersteller selbst wählen oder wir beraten Sie vor Ort.",
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
      "Bad modernisieren oder komplett neu. Wir kümmern uns um Planung, Termine und alle Partner — Sie haben nur einen Ansprechpartner.",
    beschreibung:
      "Ein neues Bad braucht mehrere Partner — jemand für die Fliesen, jemand für die Leitungen, jemand für den Strom. Das kostet normalerweise viel Nerven beim Koordinieren. Bei uns gibt es nur einen Ansprechpartner. Wir kümmern uns um alles.",
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
      "Oben auf dieser Seite wählen Sie Ihr Bad-Paket und sehen den Preisrahmen live. Beim Termin schauen wir, was wirklich nötig ist — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["🔧", "Alle Schritte aus einer Hand"],
      ["📐", "Durchdachte Planung vor dem Start"],
      ["🛡", "Angebot nach Besichtigung"],
      ["⏱", "Realistische Zeitplanung"]
    ),
    ratgeberSlug: "bad-sanierung-kosten-muenchen",
    ratgeberLabel: "Was kostet eine Badsanierung in München?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Wie lange dauert eine Badsanierung?",
        a: "Eine Komplettsanierung dauert 2–3 Wochen. Teilsanierungen (nur Fliesen, nur Wasserinstallation) 3–7 Tage. Wir planen so, dass Sie nicht zu lange ohne Bad sind.",
      },
      {
        q: "Können wir während der Sanierung in der Wohnung bleiben?",
        a: "Bei Komplettsanierungen ist das schwierig da für mehrere Tage kein Bad nutzbar ist. Wir sprechen das im Vorfeld mit Ihnen ab.",
      },
      {
        q: "Gibt es Förderungen für barrierefreie Bäder?",
        a: "Ja — die KfW fördert altersgerechten Umbau mit Zuschüssen bis 6.250 €. Wir informieren Sie bei Bedarf.",
      },
      {
        q: "Was ist im Angebot enthalten?",
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
      "Neuer Boden verändert ein Zimmer komplett. Wir beraten welches Material zu Ihnen passt, bereiten den Untergrund vor und verlegen fachgerecht — von der ersten Leiste bis zur letzten Sockelleiste.",
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
      "Laminat kostet weniger, Parkett mehr — wir zeigen Ihnen den Unterschied und was sich für Ihre Situation lohnt. Preis immer pro m² inkl. Verlegung.",
    vorteile: vorteil(
      ["🪵", "Materialberatung vor Ort"],
      ["🔊", "Trittschall & Untergrund richtig"],
      ["✓", "Saubere Kanten & Übergänge"],
      ["🚚", "Altbelag fachgerecht entsorgt"]
    ),
    ratgeberSlug: "bodenbelag-kosten-muenchen",
    ratgeberLabel: "Was kostet neuer Boden in München?",
    rechnerSituation: "erneuern",
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
    label: "Elektrotechnik",
    headline: "Elektrotechnik in München —\nunter eigener Meisterleitung",
    subline:
      "Unser eigener Elektrobereich mit technischem Betriebsleiter und Elektromeister. Abgestimmt mit dem Bauablauf und den übrigen Gewerken.",
    beschreibung:
      "Die Elektrotechnik ist Teil unserer Bau- und Sanierungsleistungen. Unser Elektromeister leitet als technischer Betriebsleiter den Elektrobereich. Leitungsführung, Trockenbau und spätere Ausstattung bereiten wir gemeinsam vor.",
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
      ["⚡", "Eigener Elektromeister"],
      ["📋", "Dokumentation & Prüfprotokoll"],
      ["🏠", "Abgestimmt mit Maler und Boden"],
      ["🔌", "Wallbox & Zukunftstechnik"]
    ),
    ratgeberSlug: "wohnung-renovieren-kosten-muenchen",
    ratgeberLabel: "Wohnung renovieren — Gesamtkosten",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Kann ich Elektroarbeiten selbst durchführen?",
        a: "Nein — in Deutschland sind Elektroarbeiten am Netz nur durch zugelassene Elektrofachbetriebe erlaubt. Pfusch kann zur Lebensgefahr und zum Verlust des Versicherungsschutzes führen.",
      },
      {
        q: "Gibt es Förderung für die Wallbox?",
        a: "Ja — viele Energieversorger und Bundesländer fördern Wallboxen. Wir informieren Sie über aktuelle Programme.",
      },
    ],
  },

  "heizung-sanitaer": {
    slug: "heizung-sanitaer",
    label: "Heizung & Wasser",
    headline: "Heizung & Wasser in München —\nModernisierung und Austausch",
    subline:
      "Heizungstausch, Wärmepumpe, neue Leitungen — mit spezialisierten Fachbetrieben, koordiniert von Bärenwald.",
    beschreibung:
      "Eine neue Heizung oder neue Leitungen greifen in viele Gewerke ein. Wir binden die passenden Heizungs- und Sanitärbetriebe ein und stimmen Anschlüsse, Elektro und Oberflächen aufeinander ab.",
    wasWirMachen: [
      "Alte Heizung gegen moderne Anlage tauschen",
      "Wärmepumpe einbauen und anschließen",
      "Heizkörper versetzen oder austauschen",
      "Wasser- und Abwasserleitungen erneuern",
      "Warmwasserbereitung erneuern",
      "Elektrische Einbindung durch unseren Elektrobereich",
    ],
    preisVon: 8000,
    preisBis: 22000,
    preisEinheit: "für Heizungstausch pauschal",
    preisHinweis:
      "Heizung komplett tauschen ab 8.000 €. Wärmepumpe wird mit bis zu 70% gefördert — wir helfen beim Antrag.",
    vorteile: vorteil(
      ["🔥", "Abgestimmt mit Elektro und Trockenbau"],
      ["♻", "Modernisierung & Förderung"],
      ["🛠", "Heizung & Wasser kombiniert"],
      ["📞", "Ein Ansprechpartner"]
    ),
    ratgeberSlug: "heizung-tauschen-kosten",
    ratgeberLabel: "Heizung tauschen — Kosten & Förderung 2025",
    rechnerSituation: "erneuern",
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
      "Einfache Neugestaltung ab 90 €/m². Terrasse aus Naturstein ab 120 €/m². Beim ersten Gespräch entwickeln wir gemeinsam eine Idee die zu Ihrem Budget passt.",
    vorteile: vorteil(
      ["🌳", "Planung & Umsetzung aus einer Hand"],
      ["🪨", "Terrasse & Wege fachgerecht"],
      ["💧", "Bewässerung nach Bedarf"],
      ["🎯", "Transparente Kostenrahmen"]
    ),
    ratgeberSlug: "generalunternehmer-vs-einzelhandwerker-muenchen",
    ratgeberLabel: "Generalunternehmer oder Einzelhandwerker?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Brauche ich eine Genehmigung?",
        a: "Für Terrassen und Wege meist nicht. Für Zäune und größere Bauten je nach Gemeinde. Wir prüfen das für Sie.",
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
    rechnerSituation: "erneuern",
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
      "Zimmer teilen, Nische bauen, Decke abhängen — das geht schneller und sauberer als Sie denken. Kein nasser Beton, keine wochenlange Trocknungszeit. Wir bauen neue Wände und Decken in Trockenbauweise.",
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
      ["✓", "Eigene Gewerke & Fachpartner"]
    ),
    ratgeberSlug: "trockenbau-kosten-muenchen",
    ratgeberLabel: "Neue Wände — was kostet das?",
    rechnerSituation: "erneuern",
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
      "Dach, Spenglerei und Gebäudehülle mit spezialisierten Fachbetrieben — koordiniert von Bärenwald.",
    beschreibung:
      "Von der Reparatur bis zur kompletten Dachsanierung: Wir binden die passenden Dach- und Spenglerbetriebe ein und stimmen die Arbeiten mit Fassade, Fenstern und den übrigen Gewerken ab.",
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
      "Kleine Reparaturen ab 250 € pauschal. Größere Schäden schauen wir uns beim Vor-Ort-Termin an und erstellen Ihnen ein Angebot. Bei Sturmschäden helfen wir auch bei der Versicherung.",
    vorteile: vorteil(
      ["🏡", "Abgestimmt mit der Gebäudehülle"],
      ["🛡", "Fachbetriebe für alle Dachformen"],
      ["📋", "Schadensdokumentation"],
      ["💶", "Klarer Kostenrahmen nach Termin"]
    ),
    ratgeberSlug: "dacharbeiten-kosten-muenchen",
    ratgeberLabel: "Dacharbeiten Kosten München",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Wer führt die Dacharbeiten aus?",
        a: "Ein spezialisierter Dachdecker- oder Spenglerbetrieb aus unserem Partnernetz. Bärenwald koordiniert und bleibt Ihr Ansprechpartner.",
      },
      {
        q: "Übernimmt die Versicherung Sturmschäden?",
        a: "Wohngebäudeversicherungen decken Sturmschäden ab Windstärke 8. Wir helfen bei der Schadensdokumentation.",
      },
    ],
  },

  dachbodenausbau: {
    slug: "dachbodenausbau",
    label: "Dachbodenausbau",
    headline: "Dachbodenausbau in München",
    subline: "Neuer Wohnraum unter dem Dach — geplant und umgesetzt als GU-Paket.",
    beschreibung:
      "Vom Rohbau bis zur fertigen Fläche: wir koordinieren Statik, Dämmung, Trockenbau und Anschlüsse. Ein Ansprechpartner, ein Kostenrahmen.",
    wasWirMachen: [
      "Bestandsaufnahme und Planung",
      "Statik und Genehmigungen abstimmen",
      "Ausbau und Trockenbau",
      "Heizung, Sanitär, Elektro anschließen",
    ],
    preisVon: 1200,
    preisBis: 2200,
    preisEinheit: "pro m² Wohnfläche (Richtwert)",
    preisHinweis:
      "Der endgültige Preis hängt von Rohbau, Höhe und Ausstattung ab — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["✓", "GU-Koordination"],
      ["✓", "Eigene Gewerke & Fachpartner"],
      ["📐", "Transparente Planung"],
      ["💶", "Klarer Kostenrahmen"]
    ),
    ratgeberSlug: "wohnung-renovieren-kosten-muenchen",
    ratgeberLabel: "Wohnung renovieren — Gesamtkosten",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Brauche ich eine Genehmigung?",
        a: "Oft ja — wir prüfen mit Ihnen die Voraussetzungen in München und empfehlen Planer.",
      },
    ],
  },

  kellerausbau: {
    slug: "kellerausbau",
    label: "Kellerausbau",
    headline: "Kellerausbau in München",
    subline: "Trockenlegen, Feuchteschutz und nutzbarer Keller — aus einer Hand.",
    beschreibung:
      "Keller ausbauen braucht Erfahrung mit Feuchteschutz und Entwässerung. Wir planen und setzen um — mit einem Angebot nach der Besichtigung.",
    wasWirMachen: [
      "Feuchteanalyse und Konzept",
      "Trockenlegung / Abdichtung",
      "Dämmung und Trockenbau",
      "Elektro und Heizung nach Bedarf",
    ],
    preisVon: 800,
    preisBis: 1600,
    preisEinheit: "pro m² Kellerfläche (Richtwert)",
    preisHinweis: "Umfang und Zustand entscheiden — verbindliches Angebot nach Termin vor Ort.",
    vorteile: vorteil(
      ["✓", "Fachbetriebe"],
      ["🛡", "Feuchteschutz im Fokus"],
      ["📋", "Dokumentation"],
      ["💶", "Angebot nach Besichtigung"]
    ),
    ratgeberSlug: "wohnung-renovieren-kosten-muenchen",
    ratgeberLabel: "Wohnung renovieren — Gesamtkosten",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Ist mein Keller überhaupt ausbaufähig?",
        a: "Das klären wir bei der Besichtigung — Höhe, Feuchte und Statik sind entscheidend.",
      },
    ],
  },

  wanddurchbruch: {
    slug: "wanddurchbruch",
    label: "Wanddurchbruch",
    headline: "Wanddurchbruch in München",
    subline: "Raum öffnen — tragend oder nicht tragend, inkl. Statik.",
    beschreibung:
      "Ein Durchbruch verändert den Grundriss. Wir koordinieren Statik, Stahlträger und den sauberen Übergang an benachbarte Gewerke.",
    wasWirMachen: [
      "Abklärung tragend / nicht tragend",
      "Statik und Ausführung",
      "Stahlträger und Abfangung",
      "Oberflächen und Übergänge",
    ],
    preisVon: 1800,
    preisBis: 8500,
    preisEinheit: "pro Öffnung (Richtwert)",
    preisHinweis: "Tragende Wände sind deutlich aufwendiger — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["✓", "Statik koordiniert"],
      ["✓", "Saubere Ausführung"],
      ["⏱", "Realistische Zeitplanung"],
      ["💶", "Transparenz"]
    ),
    ratgeberSlug: "trockenbau-kosten-muenchen",
    ratgeberLabel: "Neue Wände — was kostet das?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Wie lange dauert ein Durchbruch?",
        a: "Ohne tragende Wand oft wenige Tage — mit Statik und Träger eher 1–2 Wochen.",
      },
    ],
  },

  terrassenbau: {
    slug: "terrassenbau",
    label: "Terrassenbau",
    headline: "Terrassenbau in München",
    subline: "Neue Terrasse — Holz, WPC oder Stein, inkl. Unterbau.",
    beschreibung:
      "Von der Planung bis zur Abnahme: Material, Unterbau und Entwässerung stimmen wir auf Ihr Grundstück ab — als GU-Paket.",
    wasWirMachen: [
      "Planung und Materialwahl",
      "Unterbau und Entwässerung",
      "Aufbau und Abdichtung",
      "Angebot nach Besichtigung",
    ],
    preisVon: 220,
    preisBis: 520,
    preisEinheit: "pro m² Terrasse (Richtwert)",
    preisHinweis: "Unterbau und Zugang beeinflussen den Preis stark — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["✓", "GU-Paket"],
      ["🪵", "Holz & Stein"],
      ["📐", "Aufmaß vor Ort"],
      ["💶", "Klarer Rahmen"]
    ),
    ratgeberSlug: "generalunternehmer-vs-einzelhandwerker-muenchen",
    ratgeberLabel: "Generalunternehmer oder Einzelhandwerker?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Brauche ich eine Baugenehmigung?",
        a: "Kommt auf Höhe und Lage an — wir geben Ihnen eine klare Empfehlung.",
      },
    ],
  },

  "bad-sanieren": {
    slug: "bad-sanieren",
    label: "Bad sanieren",
    headline: "Bad sanieren in München",
    subline: "Modernisierung oder Neubad — ein Ansprechpartner für alle Gewerke.",
    beschreibung:
      "Sanitär, Fliesen, Elektro und Lüftung greifen ineinander. Wir koordinieren alles und erstellen Ihnen nach der Besichtigung ein Angebot.",
    wasWirMachen: [
      "Planung und Auswahl",
      "Abriss und Entsorgung",
      "Installation und Fliesen",
      "Abnahme",
    ],
    preisVon: 6500,
    preisBis: 20000,
    preisEinheit: "pauschal je nach Umfang",
    preisHinweis: "Kleines Bad vs. Masterbad — wir rechnen realistisch nach m² und Ausstattung.",
    vorteile: vorteil(
      ["🔧", "Alles aus einer Hand"],
      ["🛡", "Angebot nach Besichtigung"],
      ["⏱", "Termintreue"],
      ["✓", "Eigene Gewerke & Fachpartner"]
    ),
    ratgeberSlug: "bad-sanierung-kosten-muenchen",
    ratgeberLabel: "Was kostet eine Badsanierung?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Kann ich währenddessen im Objekt wohnen?",
        a: "Bei kleinen Bädern oft eingeschränkt — wir besprechen das vorab.",
      },
    ],
  },

  "boden-verlegen": {
    slug: "boden-verlegen",
    label: "Boden verlegen",
    headline: "Boden verlegen in München",
    subline: "Laminat, Parkett, Vinyl oder Fliesen — fachgerecht und sauber.",
    beschreibung:
      "Wir verlegen neuen Boden inkl. Vorbereitung der Unterlage und sauberem Übergang zu Türen und Sockeln.",
    wasWirMachen: [
      "Beratung zu Material",
      "Untergrund vorbereiten",
      "Verlegung und Abschluss",
      "Entsorgung Altbelag auf Wunsch",
    ],
    preisVon: 35,
    preisBis: 95,
    preisEinheit: "pro m²",
    preisHinweis: "Altabtrag und Untergrund können Zusatzkosten bedeuten — Angebot nach Sichtung.",
    vorteile: vorteil(
      ["✓", "Saubere Baustelle"],
      ["🪵", "Viele Materialien"],
      ["📏", "Aufmaß"],
      ["💶", "Angebot nach Besichtigung"]
    ),
    ratgeberSlug: "bodenbelag-kosten-muenchen",
    ratgeberLabel: "Was kostet neuer Boden?",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Wie lange dauert die Verlegung?",
        a: "Typisch 1–3 Tage pro Raum — je nach Größe und Material.",
      },
    ],
  },

  fassadendaemmung: {
    slug: "fassadendaemmung",
    label: "Fassadendämmung",
    headline: "Fassadendämmung in München",
    subline: "WDVS, Dämmung und Oberfläche — energetisch sinnvoll.",
    beschreibung:
      "Wir dämmen die Fassade fachgerecht und koordinieren Anstrich oder Bekleidung — inklusive Beratung zu Förderungen.",
    wasWirMachen: [
      "Energetische Bestandsaufnahme",
      "Dämmung und Details",
      "Oberfläche / Putz",
      "Dokumentation für Förderung",
    ],
    preisVon: 120,
    preisBis: 220,
    preisEinheit: "pro m² Fassade (Richtwert)",
    preisHinweis: "Gebäudehöhe und Gerüst beeinflussen den Preis — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["🧱", "WDVS-Qualität"],
      ["📋", "Förder-Hinweise"],
      ["✓", "Eigene Gewerke & Fachpartner"],
      ["💶", "Transparenz"]
    ),
    ratgeberSlug: "wohnung-renovieren-kosten-muenchen",
    ratgeberLabel: "Wohnung renovieren — Gesamtkosten",
    rechnerSituation: "erneuern",
    faq: [
      {
        q: "Gibt es Förderung?",
        a: "Oft ja für energetische Maßnahmen — weisen wir Sie auf aktuelle Programme hin.",
      },
    ],
  },

  baumarbeiten: {
    slug: "baumarbeiten",
    label: "Baumarbeiten",
    headline: "Baumarbeiten in München",
    subline: "Kronenschnitt, Fällung, Pflege — fachgerecht und genehmigungsbewusst.",
    beschreibung:
      "Wir koordinieren Baumpflege und größere Eingriffe — inklusive Hinweisen zu Meldepflichten in München.",
    wasWirMachen: [
      "Sichtung und Maßnahmenplan",
      "Kronenschnitt oder Fällung",
      "Entsorgung des Schnittguts",
      "Dokumentation",
    ],
    preisVon: 180,
    preisBis: 1200,
    preisEinheit: "pro Einsatz (Richtwert)",
    preisHinweis: "Stammumfang und Zugänglichkeit bestimmen den Preis — Angebot nach Besichtigung.",
    vorteile: vorteil(
      ["🌲", "Fachgerecht"],
      ["📋", "Genehmigungshinweise"],
      ["✓", "Versichert & sauber"],
      ["💶", "Angebot nach Besichtigung"]
    ),
    ratgeberSlug: "generalunternehmer-vs-einzelhandwerker-muenchen",
    ratgeberLabel: "Generalunternehmer oder Einzelhandwerker?",
    rechnerSituation: "betreuung",
    faq: [
      {
        q: "Brauche ich eine Genehmigung?",
        a: "Bei größeren Bäumen in München oft — wir beraten Sie vorab.",
      },
    ],
  },
};

const DEFAULT_RATGEBER_FALLBACK_SLUG = "wohnung-renovieren-kosten-muenchen";

function pickRatgeberForFallback(base: string): { slug: string; label: string } {
  const parts = base.split("-").filter((p) => p.length >= 3);
  for (const part of parts) {
    const hit = RATGEBER.find((r) => r.slug.includes(part));
    if (hit) return { slug: hit.slug, label: hit.label };
  }
  const def =
    RATGEBER.find((r) => r.slug === DEFAULT_RATGEBER_FALLBACK_SLUG) ??
    RATGEBER[0];
  return { slug: def.slug, label: def.label };
}

function leistungPreisRange(
  category: (typeof LEISTUNGEN)[number]["category"]
): Pick<LeistungsData, "preisVon" | "preisBis" | "preisEinheit"> {
  switch (category) {
    case "reparatur":
      return {
        preisVon: 120,
        preisBis: 900,
        preisEinheit: "Einsatz (Richtwert)",
      };
    case "service":
      return {
        preisVon: 80,
        preisBis: 3500,
        preisEinheit: "je nach Auftrag (Richtwert)",
      };
    case "projekt":
    default:
      return {
        preisVon: 800,
        preisBis: 85000,
        preisEinheit: "Projekt (Richtwert)",
      };
  }
}

/**
 * Kompakte Seitendaten, wenn `LEISTUNGEN` erweitert wurde, aber noch kein
 * Eintrag in {@link LEISTUNGEN_DATA} existiert (Variante A: getrennte Quellen).
 */
export function buildLeistungsDataFallback(base: string): LeistungsData | null {
  const route = LEISTUNGEN.find((l) => l.slug === base);
  if (!route) return null;
  const preset = getLeistungRechnerPreset(base);
  if (!preset) return null;
  const rat = pickRatgeberForFallback(base);
  const preis = leistungPreisRange(route.category);

  return {
    slug: base,
    label: route.label,
    headline: `${route.label} in München`,
    subline: route.kurz,
    beschreibung: `${route.label} in München: ${route.kurz}. ${route.hint}. Über unseren Preisrechner bekommen Sie einen ersten Rahmen — Angebot nach Besichtigung, unverbindlich.`,
    wasWirMachen: [
      `Schwerpunkte: ${route.hint}`,
      "Besichtigung und transparenter Kostenrahmen",
      "Abgestimmte Fachbetriebe aus einem Netzwerk",
      "Ein Ansprechpartner für Termine und Ablauf",
    ],
    ...preis,
    preisHinweis:
      "Der Endpreis ergibt sich nach Aufmaß vor Ort. ",
    vorteile: vorteil(
      ["🎯", "Ein Ansprechpartner"],
      ["✓", "Qualifizierte Betriebe"],
      ["⏱", "Zuverlässige Terminplanung"],
      ["💶", "Transparente Kosten"]
    ),
    ratgeberSlug: rat.slug,
    ratgeberLabel: rat.label,
    rechnerSituation: preset.situation,
    metaDescription: `${route.label} in München — Preisrahmen online, eigene Gewerke und Fachpartner, ein Ansprechpartner.`,
    faq: [
      {
        q: "Wie schnell gibt es einen Termin?",
        a: "Wir melden uns werktags zeitnah und koordinieren einen Besichtigungstermin.",
      },
      {
        q: "Muss ich sofort beauftragen?",
        a: "Nein. Sie entscheiden in Ruhe — das Angebot ist unverbindlich.",
      },
    ],
  };
}

export function leistungBaseSlugFromParam(slug: string): string | null {
  const raw = slug.trim();
  if (!raw) return null;

  const base = raw.endsWith("-muenchen")
    ? raw.slice(0, -"-muenchen".length)
    : raw;

  if (LEISTUNGEN_DATA[base]) return base;
  if (LEISTUNGEN.some((l) => l.slug === base)) return base;
  return null;
}
