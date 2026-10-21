/**
 * TEO-Arbeitsplatz: die EINE Rechte-Tabelle.
 * Oberfläche blendet danach aus, Server prüft mit derselben Funktion — keine zweite Stelle.
 */

export type ApRolle = 'verwaltung' | 'team' | 'eigentuemer'

export type ApPerson = {
  /** null = Hauptkonto der Organisation (kunden.auth_user_id) */
  mitgliedId: string | null
  rolle: ApRolle
  istAdmin: boolean
  darfFreigeben: boolean
  /** null = alle Objekte (Verwaltung) */
  objektIds: string[] | null
  name: string
  email: string
}

export type ApAktion =
  | 'arbeitsplatz'
  | 'vorgaenge.sehen'
  | 'vorgang.anlegen'
  | 'vorgang.an_teo'
  | 'vorgang.freigeben'
  | 'vorgang.nachricht'
  | 'kosten.sehen'
  | 'objekte.bearbeiten'
  | 'dokumente.hochladen'
  | 'plaene.verwalten'
  | 'plaene.abhaken'
  | 'team.verwalten'
  | 'einstellungen'

type Regel = (p: ApPerson) => boolean

const verwaltung: Regel = (p) => p.rolle === 'verwaltung'

const REGELN: Record<ApAktion, Regel> = {
  arbeitsplatz: verwaltung,
  'vorgaenge.sehen': () => true,
  'vorgang.anlegen': () => true,
  'vorgang.an_teo': verwaltung,
  'vorgang.freigeben': (p) => verwaltung(p) && (p.darfFreigeben || p.istAdmin),
  'vorgang.nachricht': verwaltung,
  'kosten.sehen': verwaltung,
  'objekte.bearbeiten': verwaltung,
  'dokumente.hochladen': verwaltung,
  'plaene.verwalten': verwaltung,
  'plaene.abhaken': (p) => p.rolle === 'verwaltung' || p.rolle === 'team',
  'team.verwalten': (p) => verwaltung(p) && p.istAdmin,
  einstellungen: (p) => verwaltung(p) && p.istAdmin,
}

export function darf(p: ApPerson, aktion: ApAktion): boolean {
  return REGELN[aktion](p)
}

/** Sieht die Person dieses Objekt? */
export function siehtObjekt(p: ApPerson, objektId: string | null | undefined): boolean {
  if (p.objektIds === null) return true
  return Boolean(objektId && p.objektIds.includes(objektId))
}

export const ROLLEN_LABEL: Record<ApRolle, string> = {
  verwaltung: 'Verwaltung',
  team: 'Team',
  eigentuemer: 'Eigentümer',
}
