import { createPortalNotification } from "@/lib/portal2/create-portal-notification";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

async function hasAnyPortalNotif(opts: {
  empfaengerUserId: string;
  vorgangRef: string;
  typ: string;
}): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("portal_notifications")
    .select("id")
    .eq("empfaenger_user_id", opts.empfaengerUserId)
    .eq("vorgang_ref", opts.vorgangRef)
    .eq("typ", opts.typ)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Hausmeister-Portal: nur „neuer Vorgang“ (einmalig), wenn Prüfung ansteht.
 */
export async function notifyPortalHausmeisterNeuerVorgang(input: {
  leadId: string;
  kundeObjektId?: string | null;
  titel?: string;
  text?: string;
}): Promise<{ ok: boolean; notified: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, notified: 0 };

  const leadId = input.leadId.trim();
  if (!leadId) return { ok: true, notified: 0 };

  let objektId = input.kundeObjektId?.trim() || "";
  if (!objektId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("kunde_objekt_id")
      .eq("id", leadId)
      .maybeSingle();
    objektId = String(lead?.kunde_objekt_id ?? "").trim();
  }
  if (!objektId) return { ok: true, notified: 0 };

  const { data: links } = await supabaseAdmin
    .from("hausmeister_objekte")
    .select("org_hausmeister_id")
    .eq("kunde_objekt_id", objektId);

  const hmIds = Array.from(
    new Set(
      (links ?? [])
        .map((r) => String((r as { org_hausmeister_id?: string }).org_hausmeister_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!hmIds.length) return { ok: true, notified: 0 };

  const { data: hms } = await supabaseAdmin
    .from("org_hausmeister")
    .select("portal_kunde_id")
    .in("id", hmIds);

  const portalKundeIds = Array.from(
    new Set(
      (hms ?? [])
        .map((r) => String((r as { portal_kunde_id?: string | null }).portal_kunde_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!portalKundeIds.length) return { ok: true, notified: 0 };

  const { data: kunden } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, portal_modus")
    .in("id", portalKundeIds)
    .eq("portal_modus", "hausmeister");

  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`,
    "hm_pruefung"
  );
  const titel = input.titel?.trim() || "Neuer Vorgang";
  const text =
    input.text?.trim() ||
    "Ein neuer Vorgang steht zur Hausmeister-Prüfung bereit.";

  let notified = 0;
  for (const kunde of kunden ?? []) {
    const authUserId = String(kunde.auth_user_id ?? "").trim();
    if (!authUserId) continue;

    if (
      await hasAnyPortalNotif({
        empfaengerUserId: authUserId,
        vorgangRef: leadId,
        typ: "auftrag",
      })
    ) {
      continue;
    }

    const result = await createPortalNotification({
      empfaengerUserId: authUserId,
      typ: "auftrag",
      role: "hausmeister",
      titel,
      text,
      vorgangRef: leadId,
      link,
    });
    if (result.ok) notified += 1;
  }

  return { ok: true, notified };
}
