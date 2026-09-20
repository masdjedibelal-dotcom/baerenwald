/** Empty-State-Titel (PortalInboxEmpty / PortalEmptyState). Titel ≤ 4 Wörter. */
export const EMPTY = {
  vorgaenge: 'Keine Vorgänge.',
  vorgaengeOffen: 'Keine offenen Vorgänge.',
  vorgaengeArbeit: 'Keine Vorgänge in Arbeit.',
  vorgaengeErledigt: 'Keine erledigten Vorgänge.',
  vorgaengeAktiv: 'Keine aktiven Vorgänge.',
  auftraegeAusfuehrung: 'Keine Aufträge in Ausführung.',
  meldungenFilter: 'Keine Meldungen für die gewählten Filter.',
  updates: 'Keine Updates.',
  updatesUngelesen: 'Keine ungelesenen Updates.',
  dokumente: 'Keine Dokumente.',
  dokumenteWeitere: 'Keine weiteren Dokumente.',
  treffer: 'Keine Treffer.',
  eintraege: 'Keine Einträge.',
  einheiten: 'Keine Einheiten',
  unterlagen: 'Keine Unterlagen erforderlich.',
  maengel: 'Keine Mängel',
  nochKeineVorgaenge: 'Noch keine Vorgänge',
  kontaktdaten: 'Keine Kontaktdaten',
  personen: 'Keine Personen',
  termineMonat: 'Keine Termine in diesem Monat.',
  maengelWeiter: 'Keine Mängel — weiter',
  gewaehlt: 'Keine gewählt',
  freigabeNichtsDirekt: 'Keine (nichts geht direkt)',
} as const

export type EmptyKey = keyof typeof EMPTY
