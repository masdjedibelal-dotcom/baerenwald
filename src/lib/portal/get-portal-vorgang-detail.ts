import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import { findKundeVorgangByQueryId } from "@/lib/portal/portal-detail-item";
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { loadPartnerBefundeByLeadIds } from "@/lib/org/load-partner-befund";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/**
 * Lädt einen Vorgang inkl. Medien (Signed URLs) für Detail-Ansicht.
 * Zugriff: kunde_id ODER auftraggeber_kunde_id = sessionKundeId.
 */
export async function getPortalVorgangDetail(opts: {
  sessionKundeId: string;
  vorgangId: string;
  hvPortalMode?: boolean;
}): Promise<{
  item: KundePortalDetailItem;
  partnerBefund?: Awaited<
    ReturnType<typeof loadPartnerBefundeByLeadIds>
  >[string];
} | null> {
  if (!isSupabaseConfigured()) return null;
  const kundeId = opts.sessionKundeId.trim();
  const vorgangId = opts.vorgangId.trim();
  if (!kundeId || !vorgangId) return null;

  let leadId = vorgangId;

  const { data: leadDirect } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_id, auftraggeber_kunde_id")
    .eq("id", vorgangId)
    .maybeSingle();

  if (leadDirect?.id) {
    leadId = String(leadDirect.id);
    const allowed =
      String(leadDirect.kunde_id ?? "") === kundeId ||
      String(leadDirect.auftraggeber_kunde_id ?? "") === kundeId;
    if (!allowed) return null;
  } else {
    const { data: ang } = await supabaseAdmin
      .from("angebote")
      .select("id, lead_id")
      .eq("id", vorgangId)
      .maybeSingle();
    if (ang?.lead_id) {
      leadId = String(ang.lead_id);
    } else {
      const { data: auf } = await supabaseAdmin
        .from("auftraege")
        .select("id, lead_id")
        .eq("id", vorgangId)
        .maybeSingle();
      if (auf?.lead_id) leadId = String(auf.lead_id);
      else return null;
    }

    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, kunde_id, auftraggeber_kunde_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return null;
    const allowed =
      String(lead.kunde_id ?? "") === kundeId ||
      String(lead.auftraggeber_kunde_id ?? "") === kundeId;
    if (!allowed) return null;
  }

  const data = await getPortalDataForKunde(kundeId, {
    mode: "full",
    leadIds: [leadId],
  });
  if (!data) return null;

  const items = buildKundeVorgaenge({
    leads: data.leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
    angebote: data.angebote as Parameters<
      typeof buildKundeVorgaenge
    >[0]["angebote"],
    auftraege: data.auftraege as Parameters<
      typeof buildKundeVorgaenge
    >[0]["auftraege"],
    hvPortalMode: Boolean(opts.hvPortalMode),
    mieterStatusMode: !opts.hvPortalMode,
    mieterFeedbackByLeadId: data.mieterFeedbackByLeadId,
  });

  const item =
    findKundeVorgangByQueryId(items, vorgangId) ??
    findKundeVorgangByQueryId(items, leadId) ??
    items[0] ??
    null;
  if (!item) return null;

  let partnerBefund:
    | Awaited<ReturnType<typeof loadPartnerBefundeByLeadIds>>[string]
    | undefined;
  if (opts.hvPortalMode) {
    const map = await loadPartnerBefundeByLeadIds([leadId]);
    partnerBefund = map[leadId];
  }

  return { item, partnerBefund };
}
