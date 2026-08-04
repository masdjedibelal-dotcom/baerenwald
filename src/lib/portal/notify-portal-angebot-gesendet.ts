import { createPortalNotification } from "@/lib/portal2/create-portal-notification";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nach CRM „Angebot gesendet“: In-App-Notification für HV (hv_notifications)
 * und/oder Privatkunde (portal_notifications).
 */
export async function notifyPortalAngebotGesendet(
  leadId: string
): Promise<void> {
  const trimmed = leadId.trim();
  if (!trimmed) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, kunde_id, auftraggeber_kunde_id, situation, kontakt_name, melder_name"
    )
    .eq("id", trimmed)
    .maybeSingle();

  if (!lead?.id) return;

  const { data: angebot } = await supabaseAdmin
    .from("angebote")
    .select("id, angebotsnr, leistungsumfang, status_einfach, gesendet_am")
    .eq("lead_id", trimmed)
    .order("gesendet_am", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nr =
    String(angebot?.angebotsnr ?? "").trim() ||
    String(angebot?.id ?? "").slice(0, 8).toUpperCase() ||
    "—";
  const titel =
    String(angebot?.leistungsumfang ?? "").trim() ||
    String(lead.situation ?? "").trim() ||
    "Ihr Vorgang";
  const portalPath = `/portal?section=vorgaenge&id=${encodeURIComponent(trimmed)}`;
  const body = `Angebot ${nr} „${titel}“ liegt im Portal bereit.`;

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? "").trim();
  if (orgKundeId) {
    await supabaseAdmin.from("hv_notifications").insert({
      kunde_id: orgKundeId,
      typ: "angebot",
      titel: "Neues Angebot",
      body,
      link: portalPath,
    });
  }

  const portalKundeId = String(lead.kunde_id ?? "").trim();
  if (portalKundeId && portalKundeId !== orgKundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("auth_user_id, portal_modus")
      .eq("id", portalKundeId)
      .maybeSingle();

    const authUserId = String(kunde?.auth_user_id ?? "").trim();
    const modus = String(kunde?.portal_modus ?? "").trim().toLowerCase();
    if (authUserId && modus !== "organisation") {
      await createPortalNotification({
        empfaengerUserId: authUserId,
        typ: "angebot",
        role: "kunde",
        titel: "Neues Angebot",
        templateVars: { nr, titel },
        vorgangRef: trimmed,
        link: portalPath,
      });
    }
  }

  // Privatkunde ohne separates Auftraggeber-Org-Konto
  if (!orgKundeId && portalKundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("auth_user_id, portal_modus")
      .eq("id", portalKundeId)
      .maybeSingle();

    const authUserId = String(kunde?.auth_user_id ?? "").trim();
    if (authUserId) {
      await createPortalNotification({
        empfaengerUserId: authUserId,
        typ: "angebot",
        role: "kunde",
        titel: "Neues Angebot",
        templateVars: { nr, titel },
        vorgangRef: trimmed,
        link: portalPath,
      });
    }
  }
}
