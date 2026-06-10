"use server";

import { loadRahmenvertrag } from "@/lib/partner/load-partner-compliance-data";
import { supabaseAdmin } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase";

export type PartnerRahmenvertragPreview = {
  vertragId: string | null;
  pdfUrl: string | null;
  vertragsNr: string | null;
  portalAkzeptiert: boolean;
};

export async function getPartnerRahmenvertragPreview(
  email: string
): Promise<PartnerRahmenvertragPreview> {
  const empty: PartnerRahmenvertragPreview = {
    vertragId: null,
    pdfUrl: null,
    vertragsNr: null,
    portalAkzeptiert: false,
  };

  if (!isSupabaseConfigured()) return empty;

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return empty;

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("id")
    .ilike("email", trimmed)
    .limit(1)
    .maybeSingle();

  if (!hw?.id) return empty;

  const rahmen = await loadRahmenvertrag(String(hw.id));
  if (!rahmen) return empty;

  return {
    vertragId: rahmen.id,
    pdfUrl: rahmen.pdf_signed_url ?? rahmen.pdf_url,
    vertragsNr: rahmen.vertrags_nr,
    portalAkzeptiert: Boolean(rahmen.portal_akzeptiert_am),
  };
}
