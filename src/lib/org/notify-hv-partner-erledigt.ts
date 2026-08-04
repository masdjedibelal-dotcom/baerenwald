import { supabaseAdmin } from "@/lib/supabase";

/** HV-Glocke: Handwerker hat Leistungen als erledigt gemeldet. */
export async function notifyHvPartnerErledigt(input: {
  auftragId: string;
  leadId: string;
  handwerkerName: string;
  leistungen: string[];
  /** true = alle Positionen am Auftrag erledigt (Feedback freischalten). */
  vollstaendig?: boolean;
}): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("auftraggeber_kunde_id")
    .eq("id", input.leadId)
    .maybeSingle();

  const kundeId = lead?.auftraggeber_kunde_id
    ? String(lead.auftraggeber_kunde_id)
    : null;
  if (!kundeId) return;

  const leistungText =
    input.leistungen.length === 1
      ? input.leistungen[0]
      : `${input.leistungen.length} Leistungen`;

  const vollstaendig = input.vollstaendig === true;
  const titel = vollstaendig
    ? `Auftrag erledigt: ${leistungText}`
    : `Teilabschluss: ${leistungText}`;
  const body = vollstaendig
    ? `${input.handwerkerName} meldet die letzten offenen Leistungen als erledigt. Sie können Feedback geben oder Mängel melden.`
    : `${input.handwerkerName} meldet Leistungen als erledigt. Weitere Positionen am Auftrag sind noch offen.`;
  const link = `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}`;

  await supabaseAdmin.from("hv_notifications").insert({
    kunde_id: kundeId,
    typ: "handwerker_erledigt",
    titel,
    body,
    link,
  });
}
