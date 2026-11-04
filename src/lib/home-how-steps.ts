import {
  LANDING_ICON_HOW_CONTACT,
  LANDING_ICON_HOW_COORDINATE,
  LANDING_ICON_HOW_HANDOVER,
} from "@/lib/landing-icons";

export const HOME_HOW_STEPS = [
  {
    icon: LANDING_ICON_HOW_CONTACT,
    step: "01",
    title: "Beschreiben und besichtigen",
    desc: "Sie schicken uns Ihre Wünsche, Fotos, Maße oder Pläne. Vor Ort nehmen wir den Bestand auf und klären, was möglich ist.",
  },
  {
    icon: LANDING_ICON_HOW_COORDINATE,
    step: "02",
    title: "Abstimmen und umsetzen",
    desc: "Sie erhalten ein Angebot mit dem vereinbarten Umfang. Wir koordinieren Mitarbeiter, Fachbetriebe, Material und Termine und dokumentieren den Fortschritt.",
  },
  {
    icon: LANDING_ICON_HOW_HANDOVER,
    step: "03",
    title: "Gemeinsam übergeben",
    desc: "Wir gehen das Ergebnis mit Ihnen durch. Abnahme und offene Punkte werden nachvollziehbar festgehalten.",
  },
] as const;
