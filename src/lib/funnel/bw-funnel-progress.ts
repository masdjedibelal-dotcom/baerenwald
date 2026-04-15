/**
 * Fortschritts-Gruppe (1–5) für die Bärenwald-Rechner-Progressbar.
 * Gruppen: Vorhaben → Details → Umfang → Fast fertig → Ergebnis
 */
export function getBwFunnelProgressStep(screen: string): number {
  if (screen === "situation" || screen === "bereiche") return 1;
  if (screen === "fachdetails" || screen === "kundentyp") return 2;
  if (
    screen === "umfang" ||
    screen === "zugaenglichkeit" ||
    screen === "zustand" ||
    screen === "groesse"
  ) {
    return 3;
  }
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
