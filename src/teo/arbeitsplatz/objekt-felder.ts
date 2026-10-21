/** Rollen für Kontakte am Objekt (Telefonbuch, ohne Login). */
export const KONTAKT_ROLLEN = ['ansprechpartner', 'hausmeister', 'beirat', 'notfall', 'dienstleister', 'sonstiges'] as const

export const KONTAKT_ROLLE_LABEL: Record<(typeof KONTAKT_ROLLEN)[number], string> = {
  ansprechpartner: 'Ansprechpartner',
  hausmeister: 'Hausmeister',
  beirat: 'Beirat',
  notfall: 'Notfall',
  dienstleister: 'Dienstleister',
  sonstiges: 'Sonstiges',
}
