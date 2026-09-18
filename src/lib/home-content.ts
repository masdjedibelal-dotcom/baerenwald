/** Startseite: FAQ für Inhalt + JSON-LD */

import type { FaqAccordionItem } from "@/components/home/FaqAccordion";

export type HomeFaqItem = FaqAccordionItem;

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    q: "Was ist der Unterschied zu MyHammer oder Blauarbeit?",
    a: "Bei Vergleichsportalen stellen Sie eine Anfrage und verschiedene Handwerker schicken Angebote. Sie vergleichen, entscheiden und koordinieren selbst wer wann kommt. Bei Bärenwald gibt es keinen Wettbewerb zwischen Handwerkern. Wir koordinieren alles intern — ein Ansprechpartner, eine Rechnung, kein Abstimmen. Mehr dazu: /ratgeber/generalunternehmer-vs-einzelhandwerker-muenchen",
  },
  {
    q: "Was bedeutet 'ein Ansprechpartner' konkret für mich?",
    a: "Wenn Sie Ihr Bad renovieren brauchen Sie Fliesenleger, Sanitär und oft auch Elektro. Normalerweise rufen Sie jeden Betrieb einzeln an und stimmen Termine selbst ab. Bei Bärenwald rufen Sie einmal an. Wir wissen welcher Handwerker wann kommen muss und stimmen alles intern ab. Sie bekommen Updates wenn etwas fertig ist — und am Ende eine Rechnung.",
  },
  {
    q: "Wer führt die Arbeiten durch — Bärenwald selbst oder Subunternehmer?",
    a: "Beides — je nach Gewerk. Für Garten und Landschaftsbau, Hausmeisterservice, Winterdienst und Gebäudereinigung haben wir eigene Teams vor Ort. Für Elektro, Sanitär, Heizung, Dach und Innenausbau arbeiten wir mit einem festen Netzwerk geprüfter Münchner Partnerbetriebe — alles Meisterbetriebe, zertifiziert und versichert. Den Unterschied merkt der Kunde nicht — denn die Verantwortung liegt in beiden Fällen bei Bärenwald. Ein Ansprechpartner, eine Rechnung.",
  },
  {
    q: "Wie behalte ich den Überblick über mein Projekt?",
    a: "Sie bekommen während des gesamten Projekts automatische Status-Updates per Mail — wenn etwas gestartet wird, wenn ein Meilenstein erreicht ist und wenn alles fertig ist. Nach Abschluss erhalten Sie ein digitales Abnahmeprotokoll mit Fotos — alles dokumentiert, alles nachvollziehbar. Kein Anruf nötig um zu fragen was gerade passiert.",
  },
  {
    q: "Arbeitet ihr nur mit Privatpersonen oder auch mit Verwaltungen und Gewerbe?",
    a: "Beides. Wir arbeiten für: Privatkunden — Eigentümer und Mieter die ihre Wohnung oder ihr Haus renovieren, sanieren oder regelmäßig betreuen lassen wollen. Hausverwaltungen — für laufende Objektbetreuung, Schäden und wiederkehrende Maßnahmen im Bestand mit klarer Dokumentation. Gewerbekunden — für Umbauten, Modernisierungen und technische Maßnahmen mit mehreren Gewerken und klarer Projektführung. Für Gewerbe und Hausverwaltungen erstellen wir individuelle Angebote — einfach direkt anrufen oder anfragen.",
  },
  {
    q: "Wie funktioniert der Preisrechner?",
    a: "Sie beantworten ein paar kurze Fragen zu Ihrem Vorhaben — Situation, Bereich, Umfang und Größe. In 2 Minuten sehen Sie einen realistischen Preisrahmen für Ihr Projekt. Danach können Sie einen Vor-Ort-Termin vereinbaren — die Anfahrt wird bei Beauftragung angerechnet.",
  },
  {
    q: "Wie läuft der Vor-Ort-Termin ab?",
    a: "Wir kommen zu Ihnen und schauen uns alles an. Die Anfahrtskosten werden bei Beauftragung vollständig auf den Auftrag angerechnet — Sie zahlen also nur wenn wir auch wirklich arbeiten. Nach dem Termin bekommen Sie ein genaues Festpreisangebot. Sie entscheiden danach ob Sie uns beauftragen. Sagen Sie ab, zahlen Sie nur die Anfahrt.",
  },
  {
    q: "Was passiert wenn beim Projekt unerwartete Probleme auftauchen?",
    a: "Das kommt vor — besonders bei älteren Gebäuden können hinter Wänden Dinge zum Vorschein kommen die vorher nicht sichtbar waren. In diesem Fall informieren wir Sie sofort und besprechen gemeinsam wie wir vorgehen. Kein Nachtrag ohne Ihre ausdrückliche Zustimmung — das ist unser Versprechen.",
  },
  {
    q: "Wie sauber wird die Baustelle hinterlassen?",
    a: "Wir behandeln Ihr Zuhause so wie unser eigenes. Das bedeutet: Staubschutz für alle angrenzenden Bereiche, tägliche Reinigung nach Arbeitsende und vollständige Entsorgung von Bauschutt und Verpackungen. Nach Projektabschluss übergeben wir Ihnen den Raum besenrein — und mit einem digitalen Abnahmeprotokoll damit alles dokumentiert ist.",
  },
  {
    q: "Was passiert bei Mängeln oder wenn ich nicht zufrieden bin?",
    a: "Bärenwald bleibt Ihr Ansprechpartner — vor, während und nach dem Projekt. Bei Fragen, Mängeln oder Nachbesserungen melden Sie sich direkt bei uns. Wir koordinieren alles mit den ausführenden Betrieben — Sie müssen nicht selbst mit einzelnen Handwerkern verhandeln. Nach Abschluss gibt es ein digitales Abnahmeprotokoll und gesetzliche Gewährleistung.",
  },
  {
    q: "Wie schnell kann es losgehen?",
    a: "Nach dem Vor-Ort-Termin und Ihrer Auftragsbestätigung planen wir den Start innerhalb von 1–3 Wochen — je nach Umfang und Auslastung.",
  },
  {
    q: "Für welche Region seid ihr tätig?",
    a: "München und Umgebung — inklusive Landkreise München, Dachau, Ebersberg, Erding, Freising, Fürstenfeldbruck und Starnberg.",
  },
];

export const HOME_TESTIMONIALS = [
  {
    quote:
      "„Transparente Preisspanne, pünktlicher Meister — genau das, was wir gesucht haben.“",
    who: "Familie K., Schwabing",
  },
  {
    quote:
      "„Ich hätte nie gedacht dass Bad-Renovierung so reibungslos läuft. Fliesen, Sanitär, Elektro — ich hatte einen Ansprechpartner für alles. Kein einziger Anruf den ich selbst koordinieren musste.“",
    who: "Lena M., Maxvorstadt",
  },
  {
    quote:
      "„Unverbindliche Beratung, kein Druck. So wünscht man sich Handwerk.“",
    who: "Thomas R., Grünwald",
  },
] as const;
