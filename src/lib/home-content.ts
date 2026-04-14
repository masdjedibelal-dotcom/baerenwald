/** Startseite: FAQ für Inhalt + JSON-LD */

import type { FaqAccordionItem } from "@/components/home/FaqAccordion";

export type HomeFaqItem = FaqAccordionItem;

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    q: "Was ist der Unterschied zu MyHammer oder Blauarbeit?",
    a: "Bei Vergleichsportalen stellst du eine Anfrage und verschiedene Handwerker schicken Angebote. Du vergleichst, entscheidest und koordinierst selbst wer wann kommt. Bei Bärenwald gibt es keinen Wettbewerb zwischen Handwerkern. Wir koordinieren alles intern — ein Ansprechpartner, eine Rechnung, kein Abstimmen.",
  },
  {
    q: "Was bedeutet 'ein Ansprechpartner' konkret für mich?",
    a: "Wenn du dein Bad renovierst brauchst du Fliesenleger, Sanitär und oft auch Elektro. Normalerweise rufst du jeden Betrieb einzeln an und stimmst Termine selbst ab. Bei Bärenwald rufst du einmal an. Wir wissen welcher Handwerker wann kommen muss und stimmen alles intern ab. Du bekommst Updates wenn etwas fertig ist — und am Ende eine Rechnung.",
  },
  {
    q: "Wie funktioniert der Preisrechner?",
    a: "Du beantwortest ein paar kurze Fragen zu deinem Vorhaben — Situation, Bereich, Umfang und Größe. In 2 Minuten siehst du einen realistischen Preisrahmen für dein Projekt. Danach kannst du einen Vor-Ort-Termin vereinbaren — die Anfahrt wird bei Beauftragung angerechnet.",
  },
  {
    q: "Wie läuft der Vor-Ort-Termin ab?",
    a: "Wir kommen zu dir und schauen uns alles an. Die Anfahrtskosten werden bei Beauftragung vollständig auf den Auftrag angerechnet — du zahlst also nur wenn wir auch wirklich arbeiten. Nach dem Termin bekommst du ein genaues Festpreisangebot. Du entscheidest danach ob du uns beauftragst. Sagst du ab, zahlst du nur die Anfahrt.",
  },
  {
    q: "Arbeitet Bärenwald selbst oder mit Subunternehmern?",
    a: "Wir koordinieren ein Netzwerk geprüfter Meisterbetriebe aus München und Umgebung. Alle Betriebe sind zertifiziert und versichert. Du hast immer Bärenwald als Ansprechpartner — egal welche Leistung.",
  },
  {
    q: "Was passiert wenn etwas nicht stimmt?",
    a: "Bärenwald steht als Generalunternehmer gerade. Bei Mängeln kümmern wir uns um die Nachbesserung — du musst nicht selbst mit einzelnen Handwerkern verhandeln.",
  },
  {
    q: "Wie schnell kann es losgehen?",
    a: "Nach dem Vor-Ort-Termin und deiner Auftragsbestätigung planen wir den Start innerhalb von 1–3 Wochen — je nach Umfang und Auslastung.",
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
