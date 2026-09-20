import { SITE_CONFIG } from "@/lib/config";

/** Einheitliche Texte für Partner-Login & -Registrierung (Sie-Form, COPY-REGELN). */
export const PARTNER_AUTH_COPY = {
  /** Kurz erklärt den vereinbarten Ablauf. */
  flowSteps:
    "Bärenwald legt Ihren Betrieb im System an und hinterlegt Ihre Kontakt-E-Mail. Danach registrieren Sie sich hier selbst — ohne extra Freischaltung.",

  loginHint:
    "Für Handwerksbetriebe in der Bärenwald-Partnerschaft. Nach Anlage Ihres Betriebs bei uns registrieren Sie sich einmalig — danach reicht der Login.",

  registerIntro:
    "Registrieren Sie Ihr Partner-Konto mit der E-Mail, die Bärenwald für Ihren Betrieb hinterlegt hat.",

  registerEmailHint:
    "Nutzen Sie exakt die E-Mail-Adresse aus der Einladung oder aus dem Austausch mit Bärenwald. Andere Adressen werden nicht erkannt.",

  loginSubtitle: "Anfragen, Angebote und Aufträge — für registrierte Partnerbetriebe.",

  registerSubtitle:
    "Nach Anlage Ihres Betriebs bei Bärenwald — mit Ihrer hinterlegten E-Mail.",

  landingPartnerLead:
    "Nach Anlage Ihres Betriebs bei uns: Anfragen annehmen, Angebote einreichen und Fortschritt dokumentieren.",

  landingSectionLead:
    "Kund:innen starten nach der ersten Anfrage. Partnerbetriebe registrieren sich, sobald Bärenwald den Betrieb angelegt hat.",

  errors: {
    betriebNichtAngelegt: `Ihr Betrieb ist bei Bärenwald noch nicht angelegt oder die E-Mail stimmt nicht mit unseren Unterlagen überein. Wir richten Partnerbetriebe vorab ein — danach können Sie sich hier registrieren. Rückfragen: ${SITE_CONFIG.email}`,

    bereitsRegistriert:
      "Für diese E-Mail existiert bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.",

    emailVerknuepft:
      "Diese E-Mail ist bereits mit einem anderen Partner-Konto verknüpft. Bitte wenden Sie sich an Bärenwald.",

    keineEmailImKonto: "In Ihrem Konto ist keine E-Mail hinterlegt.",

    portalGesperrt: `Ihr Partner-Zugang wurde gesperrt. Bitte wenden Sie sich an Bärenwald (${SITE_CONFIG.email}).`,
  },

  blocked: {
    title: "Betrieb nicht gefunden",
    body: `Wir konnten Ihr Partner-Konto nicht zuordnen. Das passiert, wenn Ihr Betrieb bei uns noch nicht angelegt wurde oder Sie eine andere E-Mail verwenden als die hinterlegte.`,
    steps: [
      "Bärenwald legt Ihren Handwerksbetrieb im System an.",
      "Sie erhalten die Bestätigung mit der hinterlegten E-Mail.",
      "Unter „Registrieren“ legen Sie Ihr Passwort an — fertig.",
    ],
  },

  portalGesperrt: {
    title: "Zugang gesperrt",
    body: `Ihr Partner-Zugang wurde gesperrt. Bitte wenden Sie sich an Bärenwald — wir helfen Ihnen weiter.`,
  },

  confirmEmailSuccess:
    "Wir haben Ihnen einen 4-stelligen Code per E-Mail geschickt. Geben Sie ihn hier ein — danach können Sie sich im Partner-Portal anmelden.",
} as const;
