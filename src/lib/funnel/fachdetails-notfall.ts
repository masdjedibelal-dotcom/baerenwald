/** Reihenfolge für max. 2 Fachdetail-Gewerke (höchster Einfluss zuerst). */
export const FACHDETAILS_PRIORITAET = [
  "sanitaer",
  "heizung",
  "elektro",
  "fenster",
  "boden",
  "fassade",
  "maler",
  "dach",
  "garten",
] as const;

export type FachdetailGewerkKey = (typeof FACHDETAILS_PRIORITAET)[number];

export function bereichMatchesFachdetailGewerk(
  gewerk: FachdetailGewerkKey,
  bereiche: string[]
): boolean {
  const s = new Set(bereiche);
  switch (gewerk) {
    case "sanitaer":
      return (
        s.has("bad") ||
        s.has("wasser") ||
        s.has("sanitaer") ||
        s.has("feuchtigkeit_schimmel")
      );
    case "heizung":
      return s.has("heizung");
    case "elektro":
      return s.has("strom") || s.has("elektrik") || s.has("elektro");
    case "maler":
      return (
        s.has("maler") ||
        s.has("streichen") ||
        s.has("waende") ||
        s.has("waende_boeden") ||
        s.has("feuchtigkeit_schimmel")
      );
    case "boden":
      return s.has("boden") || s.has("waende_boeden");
    case "fassade":
      return s.has("fassade");
    case "dach":
      return s.has("dach");
    case "fenster":
      return (
        s.has("fenster") ||
        s.has("fenster_tueren") ||
        s.has("fenster_tuer")
      );
    case "garten":
      return s.has("garten") || s.has("baum") || s.has("baumarbeiten");
    default:
      return false;
  }
}

export function countFachdetailGewerke(bereiche: string[]): number {
  return FACHDETAILS_PRIORITAET.filter((g) =>
    bereichMatchesFachdetailGewerk(g, bereiche)
  ).length;
}
