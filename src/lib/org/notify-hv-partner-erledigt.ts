import { createHvNotification } from "@/lib/org/create-hv-notification";
import {
  buildMeldeVorgangTitel,
  formatMeldeNotifTitel,
  MELDE_NOTIF_COPY,
} from "@/lib/org/melde-vorgang-titel";
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
    .select(
      "auftraggeber_kunde_id, situation, bereiche, funnel_daten, kontakt_nachricht, notizen, anlass, kanal"
    )
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

  const vorgangTitel = buildMeldeVorgangTitel({
    situation: lead?.situation,
    bereiche: (lead?.bereiche as string[] | null) ?? null,
    funnelDaten: lead?.funnel_daten,
    beschreibung:
      (lead?.kontakt_nachricht as string | null) ??
      (lead?.notizen as string | null) ??
      null,
  });
  const bezug =
    vorgangTitel && vorgangTitel !== "Meldung" ? vorgangTitel : leistungText;

  const vollstaendig = input.vollstaendig === true;
  if (!vollstaendig) return;

  const titel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.partnerErledigt, {
    titel: bezug,
  });
  const body = `${input.handwerkerName} meldet die Leistungen als erledigt. Der Vorgang ist abgeschlossen.`;
  const link = `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}&tab=uebersicht`;

  await createHvNotification({
    kundeId,
    typ: "abgeschlossen",
    titel,
    body,
    link,
  });
}
