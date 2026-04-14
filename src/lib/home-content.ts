/** Startseite: FAQ für Inhalt + JSON-LD */

import type { FaqAccordionItem } from "@/components/home/FaqAccordion";

export type HomeFaqItem = FaqAccordionItem;

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    q: "Wie funktioniert der Preisrechner?",
    a: "Du beantwortest ein paar kurze Fragen zu deinem Vorhaben — Situation, Bereich, Umfang und Größe. In 2 Minuten siehst du einen realistischen Preisrahmen für dein Projekt. Danach kannst du direkt einen kostenlosen Vor-Ort-Termin buchen.",
  },
  {
    q: "Ist die Erstberatung wirklich kostenlos?",
    a: "Ja, vollständig. Wir kommen zu dir, schauen uns alles an und erstellen ein genaues Angebot. Dafür entstehen keine Kosten. Du entscheidest danach ob du uns beauftragst.",
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
      "„Ein Ansprechpartner für Maler und Elektro — hat uns viel Koordination erspart.“",
    who: "Lena M., Maxvorstadt",
  },
  {
    quote:
      "„Kostenlose Erstberatung, kein Druck. So wünscht man sich Handwerk.“",
    who: "Thomas R., Grünwald",
  },
] as const;
