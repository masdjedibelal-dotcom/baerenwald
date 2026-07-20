
xport type MeldeLang = "de" | "en";

const STRINGS = {
  de: {
    melden: "Schaden melden",
    ergaenzen: "Meldung ergänzen",
    wasPassiert: "Was ist passiert?",
    wasBetroffen: "Was ist betroffen?",
    waehlen: "Bitte das Passendste wählen.",
    beschreibung: "Was ist passiert?",
    beschreibungPh: "z. B. tropfender Hahn im Bad, seit gestern",
    fotos: "Fotos vom Schaden",
    video: "Video aufnehmen (max. 60 Sek.)",
    videoHint: "Kurzes Video hilft bei der Einschätzung.",
    name: "Dein Name",
    einheit: "Wohnung / Einheit",
    einheitPh: "z. B. Whg. 12, 2. OG links",
    email: "E-Mail",
    tel: "Telefon (falls keine E-Mail)",
    weiter: "Weiter",
    zurueck: "Zurück",
    senden: "Meldung absenden",
    sending: "Wird gesendet…",
    bearbeitung: "Bearbeitung durch",
    verfuegbarkeit: "Wann passt es Ihnen?",
    verfuegbarkeitHint: "Optional: Wunschzeitraum für einen Termin — Sie können diesen Schritt überspringen.",
    verfuegbarkeitSkip: "Überspringen — kein Wunschtermin",
  },
  en: {
    melden: "Report damage",
    ergaenzen: "Complete report",
    wasPassiert: "What happened?",
    wasBetroffen: "What is affected?",
    waehlen: "Please choose the best match.",
    beschreibung: "What happened?",
    beschreibungPh: "e.g. dripping tap in bathroom since yesterday",
    fotos: "Photos of the damage",
    video: "Record video (max. 60 sec.)",
    videoHint: "A short video helps us assess the issue.",
    name: "Your name",
    einheit: "Apartment / unit",
    einheitPh: "e.g. Apt. 12, 2nd floor left",
    email: "Email",
    tel: "Phone (if no email)",
    weiter: "Continue",
    zurueck: "Back",
    senden: "Submit report",
    sending: "Sending…",
    bearbeitung: "Processed by",
    verfuegbarkeit: "When works for you?",
    verfuegbarkeitHint: "Optional: preferred time window for an appointment — you can skip this step.",
    verfuegbarkeitSkip: "Skip — no preferred time",
  },
} as const;

export function meldeT(lang: MeldeLang, key: keyof (typeof STRINGS)["de"]): string {
  return STRINGS[lang][key];
}
