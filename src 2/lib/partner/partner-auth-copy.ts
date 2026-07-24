import { SITE_CONFIG } from "@/lib/config";

/** Einheitliche Texte für Partner-Login & -Registrierung. */
export const PARTNER_AUTH_COPY = {
  /** Kurz erklärt den vereinbarten Ablauf. */
  flowSteps:
    "Bärenwald legt deinen Betrieb im System an und hinterlegt deine Kontakt-E-Mail. Danach registrierst du dich hier selbst — ohne extra Freischaltung.",

  loginHint:
    "Für Handwerksbetriebe in der Bärenwald-Partnerschaft. Nach Anlage deines Betriebs bei uns registrierst du dich einmalig — danach reicht der Login.",

  registerIntro:
    "Registriere dein Partner-Konto mit der E-Mail, die Bärenwald für deinen Betrieb hinterlegt hat.",

  registerEmailHint:
    "Nutze exakt die E-Mail-Adresse aus der Einladung oder aus dem Austausch mit Bärenwald. Andere Adressen werden nicht erkannt.",

  loginSubtitle: "Anfragen, Angebote und Aufträge — für registrierte Partnerbetriebe.",

  registerSubtitle:
    "Nach Anlage deines Betriebs bei Bärenwald — mit deiner hinterlegten E-Mail.",

  landingPartnerLead:
    "Nach Anlage deines Betriebs bei uns: Anfragen annehmen, Angebote einreichen und Fortschritt dokumentieren.",

  landingSectionLead:
    "Kund:innen starten nach der ersten Anfrage. Partnerbetriebe registrieren sich, sobald Bärenwald den Betrieb angelegt hat.",

  errors: {
    betriebNichtAngelegt: `Dein Betrieb ist bei Bärenwald noch nicht angelegt oder die E-Mail stimmt nicht mit unseren Unterlagen überein. Wir richten Partnerbetriebe vorab ein — danach kannst du dich hier registrieren. Rückfragen: ${SITE_CONFIG.email}`,

    bereitsRegistriert:
      "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an oder setze dein Passwort zurück.",

    emailVerknuepft:
      "Diese E-Mail ist bereits mit einem anderen Partner-Konto verknüpft. Bitte wende dich an Bärenwald.",

    keineEmailImKonto: "In deinem Konto ist keine E-Mail hinterlegt.",

    portalGesperrt: `Dein Partner-Zugang wurde gesperrt. Bitte wende dich an Bärenwald (${SITE_CONFIG.email}).`,
  },

  blocked: {
    title: "Betrieb nicht gefunden",
    body: `Wir konnten dein Partner-Konto nicht zuordnen. Das passiert, wenn dein Betrieb bei uns noch nicht angelegt wurde oder du eine andere E-Mail verwendest als die hinterlegte.`,
    steps: [
      "Bärenwald legt deinen Handwerksbetrieb im System an.",
      "Du erhältst die Bestätigung mit der hinterlegten E-Mail.",
      "Unter „Registrieren“ legst du dein Passwort an — fertig.",
    ],
  },

  portalGesperrt: {
    title: "Zugang gesperrt",
    body: `Dein Partner-Zugang wurde gesperrt. Bitte wende dich an Bärenwald — wir helfen dir weiter.`,
  },

  confirmEmailSuccess:
    "Wir haben dir eine Bestätigungs-E-Mail geschickt. Nach dem Klick auf den Link kannst du dich im Partner-Portal anmelden.",
} as const;
