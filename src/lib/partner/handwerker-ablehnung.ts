export const HANDWERKER_ABLEHNUNG_GRUND_VALUES = [
  "keine_kapazitaet",
  "zu_kurzfristig",
  "ausserhalb_einsatzgebiet",
  "gewerk_passt_nicht",
  "sonstiges",
] as const;

export type HandwerkerAblehnungGrund =
  (typeof HANDWERKER_ABLEHNUNG_GRUND_VALUES)[number];

export const HANDWERKER_ABLEHNUNG_GRUND_LABELS: Record<
  HandwerkerAblehnungGrund,
  string
> = {
  keine_kapazitaet: "Keine Kapazität",
  zu_kurzfristig: "Zu kurzfristig",
  ausserhalb_einsatzgebiet: "Außerhalb Einsatzgebiet",
  gewerk_passt_nicht: "Gewerk passt nicht",
  sonstiges: "Sonstiges",
};

export function isHandwerkerAblehnungGrund(
  v: string
): v is HandwerkerAblehnungGrund {
  return (HANDWERKER_ABLEHNUNG_GRUND_VALUES as readonly string[]).includes(v);
}
