/**
 * C5 — HW-Dokumentations-Story (Start → Fortschritt → Ende + Regie).
 */

export const HW_DOKU_STORY = {
  title: "Updates je Leistung",
  lead: "LV optional aktualisieren. Bei Regie: Start- und Endfoto plus kurze Beschreibung Pflicht.",
  steps: [
    {
      n: 1,
      title: "Start",
      body: "Arbeit beginnen — bei Regie mit Ankunftsfoto und Ausgangslage.",
    },
    {
      n: 2,
      title: "Update",
      body: "Zwischenschritte optional (Foto oder Text), bei Aufwand die Zeit notieren.",
    },
    {
      n: 3,
      title: "Ende",
      body: "Leistung abschließen — bei Regie mit Ergebnis-Foto. Danach Auftrag mit Signatur beenden.",
    },
  ],
  regieHint:
    "Regie: Start mit Foto + Text und Ende mit Foto + Text Pflicht — Zeit bitte miterfassen.",
  lvHint: "Festpreis/LV: Fotos und Text sind optional — einfach starten oder direkt erledigen.",
  notfallHint:
    "Notfall: Updates trotzdem direkt nachführen (Fotos + Zeit), sobald die Lage stabil ist.",
  preferredBanner: "Bitte diese Leistungen aktualisieren",
  freiesBtTitle: "Zusatznotiz",
  freiesBtBody:
    "Optionale Notiz an die Verwaltung — bei Regie ersetzen Start-/Endfotos je Leistung die Updates.",
  firstJobTitle: "Ihr erster Auftrag — so halten Sie Updates fest",
  firstJobEmpty:
    "Noch keine Leistung gestartet. Folgen Sie den drei Schritten — danach erscheinen Fortschritt und Abschluss hier.",
  positionEndeCta: "3. Ende — Update speichern",
  positionEndeToast: "Leistung aktualisiert — bereit für Abnahme.",
} as const;
