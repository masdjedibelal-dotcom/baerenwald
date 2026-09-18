/**
 * Auth für lead_befund-Actions: Org (HV) oder Portal-Hausmeister am Objekt.
 */

import { assertOrgLead, requireOrgWrite } from "@/lib/org/assert-org-objekt";
import {
  listObjektIdsForHausmeisterPortalKunde,
} from "@/lib/org/org-hausmeister";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import {
  linkPortalKundeToAuthUser,
  resolveLinkedPortalKundeId,
} from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export type BefundActor =
  | {
      kind: "org";
      orgKundeId: string;
      userId: string;
      canWrite: boolean;
    }
  | {
      kind: "hausmeister";
      orgKundeId: string;
      portalKundeId: string;
      userId: string;
      canWrite: true;
      objektIds: string[];
    };

type ActorFail = { ok: false; error: string };
type ActorOk = { ok: true; actor: BefundActor };

async function resolveAuthUser(): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };
  return { ok: true, userId: user.id, email: user.email };
}

async function tryHausmeisterActor(
  userId: string,
  email: string
): Promise<BefundActor | null> {
  let kundeId = await resolveLinkedPortalKundeId(userId);
  if (!kundeId) {
    const link = await linkPortalKundeToAuthUser({
      userId,
      email,
    });
    if (!link.ok) return null;
    kundeId = link.kundeId;
  }

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, portal_modus")
    .eq("id", kundeId)
    .maybeSingle();
  if (!kunde || String(kunde.portal_modus) !== "hausmeister") return null;

  const { data: hm } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id, org_kunde_id, portal_kunde_id")
    .eq("portal_kunde_id", kundeId)
    .limit(1)
    .maybeSingle();
  // Nur aktivierte Konten (portal_kunde_id gesetzt) — nicht bloß „Einladung geplant“
  if (!hm?.org_kunde_id || !hm.portal_kunde_id) return null;

  const objektIds = await listObjektIdsForHausmeisterPortalKunde(kundeId);
  return {
    kind: "hausmeister",
    orgKundeId: String(hm.org_kunde_id),
    portalKundeId: kundeId,
    userId,
    canWrite: true,
    objektIds,
  };
}

/** Session für Lesen/Schreiben von HM-Befunden. */
export async function requireBefundActor(): Promise<ActorOk | ActorFail> {
  const auth = await resolveAuthUser();
  if (!auth.ok) return auth;

  const hm = await tryHausmeisterActor(auth.userId, auth.email);
  if (hm) return { ok: true, actor: hm };

  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const write = requireOrgWrite(session);
  return {
    ok: true,
    actor: {
      kind: "org",
      orgKundeId: session.kunde.id,
      userId: session.userId,
      canWrite: write.ok,
    },
  };
}

export async function assertLeadForBefundActor(
  actor: BefundActor,
  leadId: string
): Promise<{ leadId: string; kundeObjektId: string | null } | null> {
  const lead = await assertOrgLead(actor.orgKundeId, leadId);
  if (!lead) return null;
  const kundeObjektId =
    (lead as { kunde_objekt_id?: string | null }).kunde_objekt_id != null
      ? String((lead as { kunde_objekt_id: string }).kunde_objekt_id)
      : null;

  if (actor.kind === "hausmeister") {
    if (!kundeObjektId || !actor.objektIds.includes(kundeObjektId)) {
      return null;
    }
  }
  return { leadId, kundeObjektId };
}

export async function assertBefundForActor(
  actor: BefundActor,
  befundId: string
): Promise<{ befundId: string; leadId: string } | null> {
  const { data } = await supabaseAdmin
    .from("lead_befunde")
    .select("id, lead_id")
    .eq("id", befundId)
    .maybeSingle();
  if (!data?.lead_id) return null;
  const lead = await assertLeadForBefundActor(actor, String(data.lead_id));
  if (!lead) return null;
  return { befundId: String(data.id), leadId: lead.leadId };
}

export function requireBefundWrite(
  actor: BefundActor
): { ok: true } | { ok: false; error: string } {
  if (!actor.canWrite) {
    return {
      ok: false,
      error: "Keine Berechtigung zum Bearbeiten der Checkliste.",
    };
  }
  return { ok: true };
}
