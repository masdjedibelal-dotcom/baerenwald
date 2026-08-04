import type { OnboardingSlide } from "@/lib/onboarding/portal-slides";

/** HV / Hausverwaltung — Onboarding (Bilder wie Portal-Audience). */
export const ORG_ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "uebersicht",
    imageBase: "01-uebersicht",
    eyebrow: "IHR COCKPIT",
    title: "Alle Meldungen im Blick",
    body: "Eingang, Freigaben und laufende Aufträge — zentral für Ihre Objekte, ohne E-Mail-Pingpong.",
    highlights: [
      "KPIs und offene Vorgänge auf dem Dashboard",
      "Filter: Offen, In Arbeit, Erledigt",
      "Schnell zur passenden Liste springen",
    ],
  },
  {
    id: "anfragen",
    imageBase: "02-anfragen",
    eyebrow: "FREIGABE",
    title: "Meldungen prüfen und freigeben",
    body: "Mieter- und Eigentümer-Meldungen landen im Eingang — Sie entscheiden Freigabe und Kostenträger.",
    highlights: [
      "Details, Fotos und Objektbezug prüfen",
      "Freigabe oder Rückfrage anstoßen",
      "Schwellenwerte für Eigentümer-Freigaben",
    ],
  },
  {
    id: "angebote",
    imageBase: "03-angebote",
    eyebrow: "VERGABE",
    title: "Angebote und Handwerker steuern",
    body: "Von der Anfrage bis zum Auftrag — Status und Unterlagen bleiben nachvollziehbar.",
    highlights: [
      "Angebotsstand und Dokumente einsehen",
      "Handwerker-Zuweisung nachverfolgen",
      "Verlauf für Revision und Nachweise",
    ],
  },
  {
    id: "auftraege",
    imageBase: "04-auftraege",
    eyebrow: "AUSFÜHRUNG",
    title: "Aufträge und Abschluss begleiten",
    body: "Bautagebuch, Abnahme und Feedback — transparent bis zum Abschluss.",
    highlights: [
      "Fortschritt und Bautagebuch einsehen",
      "Abnahme und Rückmeldungen erfassen",
      "Whitelabel und Freigaben unter Mehr/Einstellungen",
    ],
  },
];
