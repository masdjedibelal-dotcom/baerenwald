/**
 * Org-Hausmeister: Personenstamm + Objekt-Zuordnung (1:1 Objekt→HM).
 */

import { logDbError } from '@/lib/errors/log-db-error';
import { supabaseAdmin } from "@/lib/supabase";

/** Objekt-IDs für einen Portal-Hausmeister-Kunden. */
export async function listObjektIdsForHausmeisterPortalKunde(
  portalKundeId: string
): Promise<string[]> {
  const {data: hmRows, error: __dbErr348_5} = await supabaseAdmin
    .from("org_hausmeister")
    .select("id")
    .eq("portal_kunde_id", portalKundeId);
  if (__dbErr348_5) logDbError('lib/org/org-hausmeister:org_hausmeister', __dbErr348_5)
  const hmIds = (hmRows ?? []).map((r) => String(r.id));
  if (!hmIds.length) return [];
  const {data: zuord, error: __dbErr349_6} = await supabaseAdmin
    .from("hausmeister_objekte")
    .select("kunde_objekt_id")
    .in("org_hausmeister_id", hmIds);
  if (__dbErr349_6) logDbError('lib/org/org-hausmeister:hausmeister_objekte', __dbErr349_6)
  return (zuord ?? [])
    .map((r) => String(r.kunde_objekt_id ?? "").trim())
    .filter(Boolean);
}
