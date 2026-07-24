/**
 * C5 — HW-Dokumentations-Story (Start → Fortschritt → Ende + Regie).
 */

export const HW_DOKU_STORY = {
  title: "Dokumentation je Leistung",
  lead: "Pro Leistung: Startfoto → optional Fortschritt → Endfoto. Bei Regie/Aufwand Zeit miterfassen.",
  steps: [
    {
      n: 1,
      title: "Start",
      body: "Ankunftsfoto + kurze Ausgangslage — schaltet die Position frei.",
    },
    {
      n: 2,
      title: "Fortschritt",
      body: "Zwischenschritte mit Foto (optional), bei Aufwand die Zeit notieren.",
    },
    {
      n: 3,
      title: "Ende",
      body: "Ergebnis-Foto — dokumentiert die Leistung. Auftrag abschließen folgt danach mit Signatur.",
    },
  ],
  regieHint:
    "Regie / Aufwand: Bitte Zeit und Fotos mitführen — ohne Zeitnachweis bleibt die Position unvollständig.",
  notfallHint:
    "Notfall: Dokumentation trotzdem direkt nachführen (Fotos + Zeit), sobald die Lage stabil ist.",
  freiesBtTitle: "Zusatznotiz für die Verwaltung",
  freiesBtBody:
    "Das freie Bautagebuch ist eine Zusatznotiz an die HV — kein Ersatz für Start-/Endfotos je Leistung.",
  firstJobTitle: "Ihr erster Auftrag — so dokumentieren Sie",
  firstJobEmpty:
    "Noch keine Leistung gestartet. Folgen Sie den drei Schritten — danach erscheinen Fortschritt und Abschluss hier.",
  positionEndeCta: "3. Ende — Dokumentieren",
  positionEndeToast: "Leistung dokumentiert — bereit für Abnahme.",
} as const;
