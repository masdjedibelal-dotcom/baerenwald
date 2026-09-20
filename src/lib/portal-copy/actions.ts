/** Kanonische Button-Verben (Portal, Sie-Form wo nötig). */
export const ACTIONS = {
  speichern: 'Speichern',
  abbrechen: 'Abbrechen',
  loeschen: 'Löschen',
  senden: 'Senden',
  annehmen: 'Annehmen',
  ablehnen: 'Ablehnen',
  verwerfen: 'Verwerfen',
  bearbeiten: 'Bearbeiten',
  hinzufuegen: 'Hinzufügen',
  schliessen: 'Schließen',
  weiter: 'Weiter',
  zurueck: 'Zurück',
  bestaetigen: 'Bestätigen',
  erneutVersuchen: 'Erneut versuchen',
  zurUebersicht: 'Zur Übersicht',
} as const

export type ActionKey = keyof typeof ACTIONS
