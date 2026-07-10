import { resolvePartnerFileUrls } from "@/lib/partner/partner-storage";
import { supabaseAdmin } from "@/lib/supabase";

export type OrgPartnerBefundEntry = {
  id: string;
  titel: string;
  beschreibung: string | null;
  datum: string;
  fotos: string[];
  handwerkerName: string | null;
};

/** Partner-Befunde (eintrag_typ=befund) je Lead für HV read-only. */
export async function loadPartnerBefundeByLeadIds(
  leadIds: string[]
): Promise<Record<string, OrgPartnerBefundEntry[]>> {
  const ids = Array.from(
    new Set(leadIds.map((id) => id.trim()).filter(Boolean))
  );
  const out: Record<string, OrgPartnerBefundEntry[]> = {};
  if (!ids.length) return out;

  const { data: auftraege, error: aErr } = await supabaseAdmin
    .from("auftraege")
    .select("id, lead_id")
    .in("lead_id", ids);

  if (aErr) {
    console.warn("[org-portal] partner-befund auftraege:", aErr.message);
    return out;
  }

  const auftragByLead = new Map<string, string[]>();
  for (const row of auftraege ?? []) {
    const leadId = String(row.lead_id ?? "").trim();
    const auftragId = String(row.id ?? "").trim();
    if (!leadId || !auftragId) continue;
    const list = auftragByLead.get(leadId) ?? [];
    list.push(auftragId);
    auftragByLead.set(leadId, list);
  }

  const auftragIds = Array.from(auftragByLead.values()).flat();
  if (!auftragIds.length) return out;

  const { data: eintraege, error: eErr } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select(
      "id, auftrag_id, titel, beschreibung, datum, foto_urls, handwerker_id, handwerker(name, firma)"
    )
    .in("auftrag_id", auftragIds)
    .eq("eintrag_typ", "befund")
    .order("datum", { ascending: false });

  if (eErr) {
    console.warn("[org-portal] partner-befund eintraege:", eErr.message);
    return out;
  }

  const leadIdByAuftrag = new Map<string, string>();
  for (const [leadId, aids] of Array.from(auftragByLead.entries())) {
    for (const aid of aids) leadIdByAuftrag.set(aid, leadId);
  }

  for (const row of eintraege ?? []) {
    const aid = String(row.auftrag_id);
    const leadId = leadIdByAuftrag.get(aid);
    if (!leadId) continue;

    const paths = Array.isArray(row.foto_urls)
      ? (row.foto_urls as string[]).map((s) => String(s).trim()).filter(Boolean)
      : [];
    const fotos = await resolvePartnerFileUrls(paths);

    const hwRaw = row.handwerker as { name?: string; firma?: string } | { name?: string; firma?: string }[] | null;
    const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw;
    const handwerkerName =
      String(hw?.firma ?? hw?.name ?? "").trim() || null;

    const entry: OrgPartnerBefundEntry = {
      id: String(row.id),
      titel: String(row.titel ?? "Schadenbefund"),
      beschreibung: (row.beschreibung as string | null) ?? null,
      datum: String(row.datum ?? "").slice(0, 10),
      fotos,
      handwerkerName,
    };

    const list = out[leadId] ?? [];
    list.push(entry);
    out[leadId] = list;
  }

  return out;
}
