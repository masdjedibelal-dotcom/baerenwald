import {
  buildMeldeVorgangTitel,
  formatMeldeNotifTitel,
  MELDE_NOTIF_COPY,
} from "@/lib/org/melde-vorgang-titel";
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
      "id, kunde_id, auftraggeber_kunde_id, situation, bereiche, kontakt_name, melder_name, kontakt_nachricht, notizen, funnel_daten, anlass, kanal"
    )
    .eq("id", trimmed)
    .maybeSingle();

  if (!lead?.id) return;

  const { data: angebot } = await supabaseAdmin
    .from("angebote")
    .select("id, angebotsnr, leistungsumfang, status_einfach, status, gesendet_am, titel")
    .eq("lead_id", trimmed)
    .order("gesendet_am", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /** Nur nach echtem Versand — nicht nach HV-Freigabe / „Angebot einfordern“. */
  const gesendetAm = angebot?.gesendet_am
    ? String(angebot.gesendet_am).trim()
    : "";
  const statusEinfach = String(angebot?.status_einfach ?? "")
    .trim()
    .toLowerCase();
  const statusRaw = String(angebot?.status ?? "")
    .trim()
    .toLowerCase();
  const wirklichGesendet =
    Boolean(gesendetAm) ||
    statusEinfach === "gesendet" ||
    statusRaw === "gesendet" ||
    statusRaw.includes("gesendet");
  if (!angebot?.id || !wirklichGesendet) return;

  const nr =
    String(angebot.angebotsnr ?? "").trim() ||
    String(angebot.id ?? "").slice(0, 8).toUpperCase() ||
    "—";
  const vorgangTitel = buildMeldeVorgangTitel({
    situation: lead.situation,
    bereiche: lead.bereiche as string[] | null,
    funnelDaten: lead.funnel_daten,
    beschreibung:
      (lead.kontakt_nachricht as string | null) ??
      (lead.notizen as string | null) ??
      null,
  });
  const angebotTitel = String(angebot.titel ?? "").trim();
  const leistung = String(angebot.leistungsumfang ?? "").trim();
  const titel =
    (angebotTitel &&
    !/^(notfall|reparatur|schaden)\s*[·|—-]/i.test(angebotTitel)
      ? angebotTitel
      : null) ||
    vorgangTitel ||
    leistung ||
    "Ihr Vorgang";
  const portalPath = `/portal?section=vorgaenge&id=${encodeURIComponent(trimmed)}`;
  const notifTitel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.neuesAngebot, {
    titel,
  });
  const body = formatMeldeNotifTitel(MELDE_NOTIF_COPY.neuesAngebotBody, {
    titel: nr !== "—" ? `${titel} (${nr})` : titel,
  });

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? "").trim();
  if (orgKundeId) {
    await supabaseAdmin.from("hv_notifications").insert({
      kunde_id: orgKundeId,
      typ: "angebot",
      titel: notifTitel,
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
        titel: notifTitel,
        text: body,
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
        titel: notifTitel,
        text: body,
        templateVars: { nr, titel },
        vorgangRef: trimmed,
        link: portalPath,
      });
    }
  }
}
