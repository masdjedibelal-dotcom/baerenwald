import { createPortalNotification } from "@/lib/portal2/create-portal-notification";
import type {
  PortalNotifRole,
  PortalNotifTyp,
} from "@/lib/portal2/notif-types";
import {
  type PortalDeepLinkTab,
  withPortalDetailDeepLink,
} from "@/lib/portal2/portal-detail-deep-link";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PortalLeadEmpfaenger = {
  authUserId: string;
  kundeId: string;
  role: Exclude<PortalNotifRole, "handwerker" | "eigentuemer">;
  portalModus: string;
};

/**
 * Auth-User am Lead-Kunden (`leads.kunde_id` → `kunden.auth_user_id`),
 * ohne Organisations-Konten.
 */
export async function resolvePortalLeadEmpfaenger(
  leadId: string
): Promise<PortalLeadEmpfaenger | null> {
  if (!isSupabaseConfigured()) return null;
  const id = leadId.trim();
  if (!id) return null;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_id, auftraggeber_kunde_id, anlass")
    .eq("id", id)
    .maybeSingle();

  const kundeId = String(lead?.kunde_id ?? "").trim();
  if (!kundeId) return null;

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, portal_modus")
    .eq("id", kundeId)
    .maybeSingle();

  const authUserId = String(kunde?.auth_user_id ?? "").trim();
  const portalModus = String(kunde?.portal_modus ?? "")
    .trim()
    .toLowerCase();
  if (!authUserId || portalModus === "organisation") return null;

  const anlass = String(lead?.anlass ?? "").trim().toLowerCase();
  const hatAuftraggeber = Boolean(
    String(lead?.auftraggeber_kunde_id ?? "").trim()
  );
  const role: PortalLeadEmpfaenger["role"] =
    anlass === "meldung" || hatAuftraggeber ? "mieter" : "kunde";

  return { authUserId, kundeId, role, portalModus };
}

async function hasUnreadPortalNotif(opts: {
  empfaengerUserId: string;
  vorgangRef: string;
  typ: PortalNotifTyp;
}): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("portal_notifications")
    .select("id")
    .eq("empfaenger_user_id", opts.empfaengerUserId)
    .eq("vorgang_ref", opts.vorgangRef)
    .eq("typ", opts.typ)
    .eq("gelesen", false)
    .limit(1);
  return (data ?? []).length > 0;
}

/** In-App-Glocke für Portal-User am Lead (dedupliziert pro Typ+Vorgang).
 * Mieter und Eigentümer: keine Notifications.
 * Hausmeister: nur über dedizierten Pfad (neuer Vorgang).
 */
export async function notifyPortalLeadUser(input: {
  leadId: string;
  typ: PortalNotifTyp;
  titel: string;
  text: string;
  /** Deep-Link-Tab im Vorgangs-Detail; Default null. */
  deepLinkTab?: PortalDeepLinkTab | null;
  roleOverride?: PortalLeadEmpfaenger["role"];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const empfaenger = await resolvePortalLeadEmpfaenger(input.leadId);
  if (!empfaenger) return { ok: true, skipped: true };

  const role = input.roleOverride ?? empfaenger.role;
  const modus = empfaenger.portalModus;
  if (
    role === "mieter" ||
    modus === "mieter" ||
    modus === "eigentuemer" ||
    modus === "hausmeister"
  ) {
    return { ok: true, skipped: true };
  }

  const leadId = input.leadId.trim();
  if (
    await hasUnreadPortalNotif({
      empfaengerUserId: empfaenger.authUserId,
      vorgangRef: leadId,
      typ: input.typ,
    })
  ) {
    return { ok: true, skipped: true };
  }

  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`,
    input.deepLinkTab ?? null
  );

  const result = await createPortalNotification({
    empfaengerUserId: empfaenger.authUserId,
    typ: input.typ,
    role,
    titel: input.titel,
    text: input.text,
    vorgangRef: leadId,
    link,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
