import {
  LANDING_ICON_HOW_CONTACT,
  LANDING_ICON_HOW_COORDINATE,
  LANDING_ICON_HOW_HANDOVER,
} from "@/lib/landing-icons";

export const HOME_HOW_STEPS = [
  {
    icon: LANDING_ICON_HOW_CONTACT,
    step: "01",
    title: "Du rufst einmal an.",
    desc: "Du schilderst dein Anliegen — Bärenwald übernimmt den Ablauf. Kein Stunden erklären, kein Zehn-Ansprechpartner-Chaos.",
  },
  {
    icon: LANDING_ICON_HOW_COORDINATE,
    step: "02",
    title: "Wir übernehmen alles.",
    desc: "Gewerke, Termine, Umsetzung — du bleibst informiert, musst aber nichts koordinieren.",
  },
  {
    icon: LANDING_ICON_HOW_HANDOVER,
    step: "03",
    title: "Du nimmst ab.",
    desc: "Gemeinsame Abnahme, digitales Protokoll, sauber abgeschlossen.",
  },
] as const;
