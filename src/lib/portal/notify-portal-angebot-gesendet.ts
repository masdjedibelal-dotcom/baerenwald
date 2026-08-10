import {
  buildMeldeVorgangTitel,
  formatMeldeNotifTitel,
  MELDE_NOTIF_COPY,
} from "@/lib/org/melde-vorgang-titel";
import { createHvNotification } from "@/lib/org/create-hv-notification";
import { createPortalNotification } from "@/lib/portal2/create-portal-notification";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { notifyPortalEigentuemer } from "@/lib/portal/notify-portal-eigentuemer";
import { supabaseAdmin } from "@/lib/supabase";

async function hasRecentHvAngebotNotif(opts: {
  kundeId: string;
  leadId: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("hv_notifications")
    .select("id")
    .eq("kunde_id", opts.kundeId)
    .eq("typ", "angebot")
    .ilike("link", `%${opts.leadId}%`)
    .gte("created_at", since)
    .limit(1);
  return (data ?? []).length > 0;
}

async function hasUnreadPortalAngebotNotif(opts: {
  empfaengerUserId: string;
  leadId: string;
}): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("portal_notifications")
    .select("id")
    .eq("empfaenger_user_id", opts.empfaengerUserId)
    .eq("vorgang_ref", opts.leadId)
    .eq("typ", "angebot")
    .eq("gelesen", false)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Nach CRM „Angebot gesendet“: In-App-Notification für HV (hv_notifications),
 * Privatkunde/Mieter (portal_notifications) und Eigentümer (Status-Update).
 */
export async function notifyPortalAngebotGesendet(
  leadId: string
): Promise<void> {
  const trimmed = leadId.trim();
  if (!trimmed) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, kunde_id, auftraggeber_kunde_id, kunde_objekt_id, situation, bereiche, kontakt_name, melder_name, kontakt_nachricht, notizen, funnel_daten, anlass, kanal, preis_max, budget_ca"
    )
    .eq("id", trimmed)
    .maybeSingle();

  if (!lead?.id) return;

  const { data: angebot } = await supabaseAdmin
    .from("angebote")
    .select(
      "id, angebotsnr, leistungsumfang, status_einfach, status, gesendet_am, gesendet_kunde_at, pdf_url, titel, gesamt_preis, gesamt_max"
    )
    .eq("lead_id", trimmed)
    .order("gesendet_am", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /** Nach CRM-Event „Angebot gesendet“ — inkl. PDF auch wenn Status noch nachzieht. */
  const gesendetAm = angebot?.gesendet_am
    ? String(angebot.gesendet_am).trim()
    : "";
  const gesendetKundeAt = angebot?.gesendet_kunde_at
    ? String(angebot.gesendet_kunde_at).trim()
    : "";
  const statusEinfach = String(angebot?.status_einfach ?? "")
    .trim()
    .toLowerCase();
  const statusRaw = String(angebot?.status ?? "")
    .trim()
    .toLowerCase();
  const hasPdf = Boolean(String(angebot?.pdf_url ?? "").trim());
  const wirklichGesendet =
    Boolean(gesendetAm) ||
    Boolean(gesendetKundeAt) ||
    statusEinfach === "gesendet" ||
    statusEinfach === "gesendet_kunde" ||
    statusRaw === "gesendet" ||
    statusRaw.includes("gesendet") ||
    hasPdf;
  if (!angebot?.id || !wirklichGesendet) return;

  const nr =
    String(angebot.angebotsnr ?? "").trim() ||
    String(angebot.id ?? "").slice(0, 8).toUpperCase() ||
    "—";
  const vorgangTitel = buildMeldeVorgangTitel({
    situation: lead.situation as string | null,
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
  const portalPath = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(trimmed)}`,
    "angebot"
  );
  const notifTitel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.neuesAngebot, {
    titel,
  });
  const body = formatMeldeNotifTitel(MELDE_NOTIF_COPY.neuesAngebotBody, {
    titel: nr !== "—" ? `${titel} (${nr})` : titel,
  });

  const insertHv = async (kundeId: string) => {
    if (await hasRecentHvAngebotNotif({ kundeId, leadId: trimmed })) return;
    await createHvNotification({
      kundeId,
      typ: "angebot",
      titel: notifTitel,
      body,
      link: portalPath,
    });
  };

  const insertPortalUser = async (authUserId: string) => {
    if (
      await hasUnreadPortalAngebotNotif({
        empfaengerUserId: authUserId,
        leadId: trimmed,
      })
    ) {
      return;
    }
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
  };

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? "").trim();
  if (orgKundeId) {
    await insertHv(orgKundeId);
  }

  const portalKundeId = String(lead.kunde_id ?? "").trim();
  if (portalKundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("auth_user_id, portal_modus")
      .eq("id", portalKundeId)
      .maybeSingle();

    const authUserId = String(kunde?.auth_user_id ?? "").trim();
    const modus = String(kunde?.portal_modus ?? "").trim().toLowerCase();

    if (modus === "organisation") {
      if (!orgKundeId || orgKundeId === portalKundeId) {
        await insertHv(portalKundeId);
      }
    } else if (authUserId && portalKundeId !== orgKundeId) {
      await insertPortalUser(authUserId);
    } else if (authUserId && !orgKundeId) {
      await insertPortalUser(authUserId);
    }
  }

  // Eigentümer: nur Status-Update (keine Freigabe über Schwelle)
  await notifyPortalEigentuemer({
    leadId: trimmed,
    kind: "update",
    titel: notifTitel,
    text: `Update zu „${titel}“: Angebot liegt vor.`,
    deepLinkTab: "uebersicht",
    kundeObjektId: String(lead.kunde_objekt_id ?? "").trim() || null,
  });
}
