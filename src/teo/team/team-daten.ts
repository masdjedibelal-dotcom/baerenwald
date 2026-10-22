import 'server-only'

import { ladePlaene, type ApPlan } from '@/teo/arbeitsplatz/daten/plaene'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'

/** Pläne dieser Person: ihr zugewiesen oder dem ganzen Team. */
export async function ladeMeinePlaene(k: ApKontext): Promise<ApPlan[]> {
  const alle = await ladePlaene(k)
  return alle.filter((p) => p.zustaendig === 'team' && (!p.zustaendigId || p.zustaendigId === k.person.mitgliedId))
}
