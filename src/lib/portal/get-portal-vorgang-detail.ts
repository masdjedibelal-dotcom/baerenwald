import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import { findKundeVorgangByQueryId } from "@/lib/portal/portal-detail-item";
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { loadPartnerBefundeByLeadIds } from "@/lib/org/load-partner-befund";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

async function resolveLeadIdForVorgang(
  vorgangId: string,
  kundeId: string
): Promise<string | null> {
  const { data: leadDirect } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_id, auftraggeber_kunde_id")
    .eq("id", vorgangId)
    .maybeSingle();

  if (leadDirect?.id) {
    const allowed =
      String(leadDirect.kunde_id ?? "") === kundeId ||
      String(leadDirect.auftraggeber_kunde_id ?? "") === kundeId;
    return allowed ? String(leadDirect.id) : null;
  }

  const [{ data: ang }, { data: auf }] = await Promise.all([
    supabaseAdmin
      .from("angebote")
      .select("id, lead_id")
      .eq("id", vorgangId)
      .maybeSingle(),
    supabaseAdmin
      .from("auftraege")
      .select("id, lead_id")
      .eq("id", vorgangId)
      .maybeSingle(),
  ]);

  const leadId =
    (ang?.lead_id != null ? String(ang.lead_id) : "") ||
    (auf?.lead_id != null ? String(auf.lead_id) : "");
  if (!leadId) return null;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_id, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;
  const allowed =
    String(lead.kunde_id ?? "") === kundeId ||
    String(lead.auftraggeber_kunde_id ?? "") === kundeId;
  return allowed ? leadId : null;
}

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

  const leadId = await resolveLeadIdForVorgang(vorgangId, kundeId);
  if (!leadId) return null;

  const [data, partnerMap] = await Promise.all([
    getPortalDataForKunde(kundeId, {
      mode: "full",
      leadIds: [leadId],
    }),
    opts.hvPortalMode
      ? loadPartnerBefundeByLeadIds([leadId])
      : Promise.resolve(
          {} as Awaited<ReturnType<typeof loadPartnerBefundeByLeadIds>>
        ),
  ]);
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

  return {
    item,
    partnerBefund: opts.hvPortalMode ? partnerMap[leadId] : undefined,
  };
}
