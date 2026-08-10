/** Portal-Kontext für Subscription / Soft-Prompt. */
export type PushPortalScope = "portal" | "partner";

export type PushPayload = {
  title: string;
  body: string;
  /** Relativer oder absoluter Deep-Link */
  url: string;
  tag?: string;
};

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

/** Feste Copy — nie Preise im OS-Banner. */
export const PUSH_COPY = {
  angebotLiegtVor: {
    title: "Angebot liegt vor",
    body: "Bitte im Portal ansehen und entscheiden.",
  },
  neuerVorgang: {
    title: "Neuer Vorgang",
    body: "Es gibt eine neue Meldung in Ihrem Portal.",
  },
  freigabeNoetig: {
    title: "Freigabe nötig",
    body: "Bitte im Portal prüfen und freigeben.",
  },
  neuerAuftrag: {
    title: "Neuer Auftrag",
    body: "Bitte im Partner-Portal prüfen.",
  },
  test: {
    title: "Bärenwald Push",
    body: "Test erfolgreich — Benachrichtigungen sind aktiv.",
  },
} as const;
