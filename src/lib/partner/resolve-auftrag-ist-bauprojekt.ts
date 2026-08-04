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

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("ist_bauprojekt")
    .eq("id", aid)
    .maybeSingle()

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
