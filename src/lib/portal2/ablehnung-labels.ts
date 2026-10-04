/**
 * Ablehnungsgründe Kunde/HV — gleiche Keys wie CRM (`angebote.ablehnung_grund`),
 * damit Bärenwald den Grund im CRM-Banner sieht.
 */
export const PORTAL_KUNDE_ABLEHNUNG_GRUND_OPTIONS = [
  "zu_teuer",
  "konkurrenz",
  "kein_interesse",
  "sonstiges",
] as const;

export type PortalKundeAblehnungGrund =
  (typeof PORTAL_KUNDE_ABLEHNUNG_GRUND_OPTIONS)[number];

export const PORTAL_KUNDE_ABLEHNUNG_GRUND_LABELS: Record<
  PortalKundeAblehnungGrund,
  string
> = {
  zu_teuer: "Zu teuer",
  konkurrenz: "Konkurrenz gewählt",
  kein_interesse: "Kein Interesse mehr",
  sonstiges: "Sonstiges",
};
