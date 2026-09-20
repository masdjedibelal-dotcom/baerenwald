import { logDbError } from '@/lib/errors/log-db-error'
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import {
  projektHatBauleistung,
  type PartnerGewerkRow,
} from "@/lib/partner/compliance-partner-profile";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** CRM-Flag `auftraege.ist_bauprojekt` hat Vorrang, sonst Gewerk-Heuristik. */
export async function resolveAuftragIstBauprojekt(
  auftragId: string,
  opts?: {
    projektGewerkSlugs?: string[];
    alleGewerke?: PartnerGewerkRow[];
  }
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return isPartnerBauprojektAuftrag({
      ist_bauprojekt: null,
      compliance_projekt: null,
    });
  }

  const aid = auftragId.trim()
  if (!aid) return false

  const {data: auftrag, error: __dbErr418_1} = await supabaseAdmin
    .from("auftraege")
    .select("ist_bauprojekt")
    .eq("id", aid)
    .maybeSingle()
  if (__dbErr418_1) logDbError('lib/partner/resolve-auftrag-ist-bauprojekt:auftraege', __dbErr418_1)
  const explicit = (auftrag as { ist_bauprojekt?: boolean | null } | null)
    ?.ist_bauprojekt

  if (explicit === true) return true
  if (explicit === false) return false

  const slugs = opts?.projektGewerkSlugs ?? []
  const gewerke = opts?.alleGewerke ?? []
  if (slugs.length && gewerke.length) {
    return projektHatBauleistung(slugs, gewerke)
  }

  return false
}
