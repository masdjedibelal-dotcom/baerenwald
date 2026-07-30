/**
 * C5 — HW-Dokumentations-Story (Start → Fortschritt → Ende + Regie).
 */

export const HW_DOKU_STORY = {
  title: "Dokumentation je Leistung",
  lead: "LV optional dokumentieren. Bei Regie: Start- und Endfoto plus kurze Beschreibung Pflicht.",
  steps: [
    {
      n: 1,
      title: "Start",
      body: "Arbeit beginnen — bei Regie mit Ankunftsfoto und Ausgangslage.",
    },
    {
      n: 2,
      title: "Fortschritt",
      body: "Zwischenschritte optional (Foto oder Text), bei Aufwand die Zeit notieren.",
    },
    {
      n: 3,
      title: "Ende",
      body: "Leistung abschließen — bei Regie mit Ergebnis-Foto. Danach Auftrag mit Signatur beenden.",
    },
  ],
  regieHint:
    "Regie: Start- und Endfoto sowie Beschreibung Pflicht — Zeit bitte miterfassen.",
  lvHint: "Festpreis/LV: Fotos und Text sind optional — einfach starten oder direkt erledigen.",
  notfallHint:
    "Notfall: Dokumentation trotzdem direkt nachführen (Fotos + Zeit), sobald die Lage stabil ist.",
  freiesBtTitle: "Zusatznotiz für die Verwaltung",
  freiesBtBody:
    "Das freie Bautagebuch ist eine Zusatznotiz an die HV — bei Regie ersetzen Start-/Endfotos je Leistung.",
  firstJobTitle: "Ihr erster Auftrag — so dokumentieren Sie",
  firstJobEmpty:
    "Noch keine Leistung gestartet. Folgen Sie den drei Schritten — danach erscheinen Fortschritt und Abschluss hier.",
  positionEndeCta: "3. Ende — Dokumentieren",
  positionEndeToast: "Leistung dokumentiert — bereit für Abnahme.",
} as const;
