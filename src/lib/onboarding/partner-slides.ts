import type { OnboardingSlide } from "@/lib/onboarding/portal-slides";

export const PARTNER_ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "uebersicht",
    imageBase: "01-uebersicht",
    eyebrow: "DEIN COCKPIT",
    title: "Tagesgeschäft zentral",
    body: "Offene Anfragen, laufende Angebote und Aufträge — ohne Excel und E-Mail-Chaos.",
    highlights: [
      "Übersicht mit KPIs öffnen",
      "Offene Anfragen priorisieren",
      "Planer für Termine nutzen",
    ],
  },
  {
    id: "anfragen",
    imageBase: "02-anfragen",
    eyebrow: "ZUSAGE",
    title: "Anfragen annehmen",
    body: "Qualifizierte Projekte von Bärenwald — Details prüfen, annehmen und direkt mit dem Angebot starten.",
    highlights: [
      "Projektinfos und Unterlagen lesen",
      "„Annehmen“ oder mit Begründung ablehnen",
      "Danach Preis & PDF im nächsten Schritt",
    ],
  },
  {
    id: "angebote",
    imageBase: "03-angebote",
    eyebrow: "KALKULATION",
    title: "Preis & PDF an Bärenwald",
    body: "Netto oder Brutto plus Angebots-PDF einreichen — als Kalkulation für Bärenwald als Generalunternehmer.",
    highlights: [
      "Preis eintragen (Netto/Brutto)",
      "Angebots-PDF hochladen",
      "Bärenwald prüft und vergibt die Leistung als GU",
    ],
  },
  {
    id: "auftraege",
    imageBase: "04-auftraege",
    eyebrow: "BAUTAGEBUCH",
    title: "Fortschritt dokumentieren",
    body: "Tagebuch-Einträge mit Fotos und Notizen — Kunde und Bärenwald sehen den Stand live.",
    highlights: [
      "Neuen Bautagebuch-Eintrag anlegen",
      "Fotos vom Fortschritt hochladen",
      "Rechnung nach Abschluss einreichen",
    ],
  },
];
