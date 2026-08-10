import {
  buildMeldeVorgangTitel,
  formatMeldeNotifTitel,
  MELDE_NOTIF_COPY,
} from "@/lib/org/melde-vorgang-titel";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
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
    .select(
      "auftraggeber_kunde_id, situation, bereiche, funnel_daten, kontakt_nachricht, notizen"
    )
    .eq("id", auftrag.lead_id)
    .maybeSingle();

  const kundeId = lead?.auftraggeber_kunde_id
    ? String(lead.auftraggeber_kunde_id)
    : null;
  if (!kundeId) return;

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
    vorgangTitel && vorgangTitel !== "Meldung"
      ? vorgangTitel
      : String(auftrag.titel ?? "").trim() || input.eintragTitel;

  const titel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.bautagebuch, {
    titel: bezug,
  });
  const body = `${input.handwerkerName} hat „${input.eintragTitel}“ veröffentlicht — direkt im Portal sichtbar.`;
  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(String(auftrag.lead_id))}`,
    "bautagebuch"
  );

  await supabaseAdmin.from("hv_notifications").insert({
    kunde_id: kundeId,
    typ: "bautagebuch",
    titel,
    body,
    link,
  });
}
