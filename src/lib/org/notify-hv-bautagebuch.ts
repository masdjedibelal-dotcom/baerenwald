import { supabaseAdmin } from "@/lib/supabase";

/** HV-Glocke: neuer Bautagebuch-Eintrag vom Partner. */
export async function notifyHvPartnerBautagebuch(input: {
  auftragId: string;
  handwerkerName: string;
  eintragTitel: string;
}): Promise<void> {
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, lead_id")
    .eq("id", input.auftragId)
    .maybeSingle();

  if (!auftrag?.lead_id) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("auftraggeber_kunde_id")
    .eq("id", auftrag.lead_id)
    .maybeSingle();

  const kundeId = lead?.auftraggeber_kunde_id
    ? String(lead.auftraggeber_kunde_id)
    : null;
  if (!kundeId) return;

  const titel = `Bautagebuch: ${input.eintragTitel}`;
  const body = `${input.handwerkerName} hat einen Eintrag zu „${auftrag.titel ?? "Auftrag"}“ veröffentlicht — direkt im Portal sichtbar.`;
  const link = `/portal?section=vorgaenge&id=${encodeURIComponent(String(auftrag.lead_id))}`;

  await supabaseAdmin.from("hv_notifications").insert({
    kunde_id: kundeId,
    typ: "bautagebuch",
    titel,
    body,
    link,
  });
}
