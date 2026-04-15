/**
 * PLZ-Validierung für den Bärenwald-Funnel.
 * Erlaubter Radius: München + ca. 50 km Umland.
 */

export const PLZ_ERLAUBT_PREFIXE: string[] = [
  // München Stadt
  "803", "804", "805", "806",
  "807", "808", "809", "810",
  "811", "812", "813", "814",
  "815", "816", "817", "818",
  "819",
  // Landkreis München + direktes Umland
  "820", "821", "822", "823",
  "824", "825", "826", "827",
  "828", "829",
  // Landkreis Ebersberg / Erding
  "855", "856", "857", "858",
  "859",
  // Landkreis Dachau / Fürstenfeldbruck
  "851", "852", "853", "854",
  // Landkreis Bad Tölz / Wolfratshausen
  "830", "831", "832",
  // Landkreis Miesbach
  "833", "834",
  // Landkreis Landsberg am Lech
  "860", "861",
];

/** Explizit ausgeschlossen — zu weit oder anderer Markt */
export const PLZ_AUSGESCHLOSSEN_PREFIXE: string[] = [
  "86", // Augsburg (außer 860/861)
  "87", // Allgäu
  "88", // Allgäu / Ulm
  "89", // Ulm
  "90", // Nürnberg
  "91", // Nürnberg Umland
  "92", // Amberg
  "93", // Regensburg
  "94", // Passau
  "95", // Bayreuth
  "96", // Bamberg
  "97", // Würzburg
];

export function isPlzErlaubt(plz: string): boolean {
  if (!plz || plz.length < 4) return false;

  // Erlaubte 3-stellige Präfixe haben Vorrang vor 2-stelligen Ausschlüssen
  for (const prefix of PLZ_ERLAUBT_PREFIXE) {
    if (plz.startsWith(prefix)) return true;
  }

  // Ausgeschlossene 2-stellige Präfixe
  for (const prefix of PLZ_AUSGESCHLOSSEN_PREFIXE) {
    if (plz.startsWith(prefix)) return false;
  }

  return false;
}

export function getPlzStatus(
  plz: string
): "erlaubt" | "ausserhalb" | "ungueltig" {
  if (!plz || plz.length !== 5 || !/^\d{5}$/.test(plz)) {
    return "ungueltig";
  }
  return isPlzErlaubt(plz) ? "erlaubt" : "ausserhalb";
}
