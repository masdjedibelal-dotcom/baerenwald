/**
 * Fortschritts-Gruppe (1–5) für die Bärenwald-Rechner-Progressbar.
 * Gruppen: Vorhaben → Umfang & Größe → Fachdetails & Kundentyp → Ort → Ergebnis
 */
export function getBwFunnelProgressStep(screen: string): number | null {
  if (
    screen === "trust_intro" ||
    screen === "trust_preis" ||
    screen === "trust_qualitaet"
  ) {
    return null;
  }
  if (screen === "situation" || screen === "bereiche") return 1;
  if (
    screen === "umfang" ||
    screen === "zugaenglichkeit" ||
    screen === "zustand" ||
    screen === "groesse"
  ) {
    return 2;
  }
  if (screen.startsWith("fachdetails_") || screen === "kundentyp") return 3;
  if (screen === "ort") return 4;
  if (
    screen === "loading" ||
    screen === "result" ||
    screen === "lead" ||
    screen === "danke" ||
    screen === "ausserhalb" ||
    screen === "beratung-lead"
  ) {
    return 5;
  }
  return 1;
}
