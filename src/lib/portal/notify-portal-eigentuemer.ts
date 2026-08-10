import { createPortalNotification } from "@/lib/portal2/create-portal-notification";
import type { PortalNotifTyp } from "@/lib/portal2/notif-types";
import {
  type PortalDeepLinkTab,
  withPortalDetailDeepLink,
} from "@/lib/portal2/portal-detail-deep-link";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Eigentümer: nur neu · Updates · abgeschlossen (keine Freigabe-Handlung). */
export type EigentuemerNotifKind = "neu" | "update" | "abgeschlossen";

function typForKind(kind: EigentuemerNotifKind): PortalNotifTyp {
  if (kind === "neu") return "auftrag";
  if (kind === "abgeschlossen") return "status";
  return "info";
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

/**
 * Fan-out an alle Eigentümer mit Zuordnung zum Lead-Objekt (`eigentuemer_objekte`).
 */
export async function notifyPortalEigentuemer(input: {
  leadId: string;
  kind: EigentuemerNotifKind;
  titel: string;
  text: string;
  deepLinkTab?: PortalDeepLinkTab | null;
  /** Optional — sonst aus Lead geladen. */
  kundeObjektId?: string | null;
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

  const { data: zuordnung, error: zuordErr } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("kunde_id")
    .eq("kunde_objekt_id", objektId);

  if (zuordErr) {
    console.warn(
      "[notifyPortalEigentuemer] eigentuemer_objekte:",
      zuordErr.message
    );
    return { ok: false, notified: 0, error: zuordErr.message };
  }

  const kundeIds = Array.from(
    new Set(
      (zuordnung ?? [])
        .map((r) => String((r as { kunde_id: string }).kunde_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!kundeIds.length) return { ok: true, notified: 0 };

  const { data: kunden, error: kundenErr } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, portal_modus")
    .in("id", kundeIds)
    .eq("portal_modus", "eigentuemer");

  if (kundenErr) {
    console.warn("[notifyPortalEigentuemer] kunden:", kundenErr.message);
    return { ok: false, notified: 0, error: kundenErr.message };
  }

  const typ = typForKind(input.kind);
  const link = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`,
    input.deepLinkTab ?? null
  );

  let notified = 0;
  for (const kunde of kunden ?? []) {
    const authUserId = String(kunde.auth_user_id ?? "").trim();
    if (!authUserId) continue;

    if (
      await hasUnreadPortalNotif({
        empfaengerUserId: authUserId,
        vorgangRef: leadId,
        typ,
      })
    ) {
      continue;
    }

    const result = await createPortalNotification({
      empfaengerUserId: authUserId,
      typ,
      role: "eigentuemer",
      titel: input.titel,
      text: input.text,
      vorgangRef: leadId,
      link,
    });
    if (result.ok) notified += 1;
  }

  return { ok: true, notified };
}
