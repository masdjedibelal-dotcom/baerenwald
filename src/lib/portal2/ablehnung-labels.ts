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

export function isPortalKundeAblehnungGrund(
  v: string
): v is PortalKundeAblehnungGrund {
  return (PORTAL_KUNDE_ABLEHNUNG_GRUND_OPTIONS as readonly string[]).includes(v);
}

export function labelPortalKundeAblehnung(
  raw: string | null | undefined
): string {
  if (!raw) return "—";
  return isPortalKundeAblehnungGrund(raw)
    ? PORTAL_KUNDE_ABLEHNUNG_GRUND_LABELS[raw]
    : raw;
}
