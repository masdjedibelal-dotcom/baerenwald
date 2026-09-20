/** Bestätigungen — Dirty / Löschen. */
export const CONFIRM = {
  dirty: 'Änderungen verwerfen?',
  dirtyBody: 'Nicht gespeicherte Eingaben gehen verloren.',
  delete: 'Wirklich löschen?',
  deleteBody: 'Dieser Schritt lässt sich nicht rückgängig machen.',
  deleteConfirm: 'Löschen',
  cancel: 'Abbrechen',
  continueEditing: 'Weiter bearbeiten',
  discard: 'Verwerfen',
  restoreDraft: 'Wiederherstellen',
  restoreDecline: 'Neu beginnen',
} as const

export type ConfirmKey = keyof typeof CONFIRM
