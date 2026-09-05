import {
  LANDING_ICON_HOW_CONTACT,
  LANDING_ICON_HOW_COORDINATE,
  LANDING_ICON_HOW_HANDOVER,
} from "@/lib/landing-icons";

export const HOME_HOW_STEPS = [
  {
    icon: LANDING_ICON_HOW_CONTACT,
    step: "01",
    title: "Sie rufen einmal an.",
    desc: "Sie schildern Ihr Anliegen — Bärenwald übernimmt den Ablauf. Kein Stunden erklären, kein Zehn-Ansprechpartner-Chaos.",
  },
  {
    icon: LANDING_ICON_HOW_COORDINATE,
    step: "02",
    title: "Wir übernehmen alles.",
    desc: "Gewerke, Termine, Umsetzung — Sie bleiben informiert, müssen aber nichts koordinieren.",
  },
  {
    icon: LANDING_ICON_HOW_HANDOVER,
    step: "03",
    title: "Sie nehmen ab.",
    desc: "Gemeinsame Abnahme, digitales Protokoll, sauber abgeschlossen.",
  },
] as const;
