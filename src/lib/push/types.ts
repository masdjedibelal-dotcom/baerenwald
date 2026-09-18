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

/** OS-Notification: Titel leer lassen — PWA-Name kommt vom Manifest. */
export const PUSH_APP_TITLE = "" as const;

/** Feste Copy — nie Preise im OS-Banner. Titel immer leer (PWA-Name). */
export const PUSH_COPY = {
  angebotLiegtVor: {
    title: PUSH_APP_TITLE,
    body: "Angebot liegt vor — bitte im Portal ansehen und entscheiden.",
  },
  neuerVorgang: {
    title: PUSH_APP_TITLE,
    body: "Es gibt eine neue Meldung in Ihrem Portal.",
  },
  freigabeNoetig: {
    title: PUSH_APP_TITLE,
    body: "Freigabe nötig — bitte im Portal prüfen und freigeben.",
  },
  neuerAuftrag: {
    title: PUSH_APP_TITLE,
    body: "Neuer Auftrag — bitte im Partner-Portal prüfen.",
  },
  test: {
    title: PUSH_APP_TITLE,
    body: "Test erfolgreich — Benachrichtigungen sind aktiv.",
  },
} as const;
