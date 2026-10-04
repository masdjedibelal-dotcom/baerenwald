"use server";

import { revalidatePath } from "next/cache";

import { acceptCrmRahmenvertragLoggedIn } from "@/lib/partner/partner-crm-api";
import { persistPortalRahmenvertragAkzeptanz } from "@/lib/partner/persist-portal-rahmenvertrag";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export type PartnerRahmenvertragAcceptResult = { ok: true } | { ok: false; error: string };

/**
 * Eingeloggt: Rahmenvertrag annehmen.
 * (Registrierung: siehe acceptPortalRahmenvertragAfterVerifiedEmail nach OTP.)
 */
export async function acceptPartnerRahmenvertrag(opts: {
  vertragId: string;
  akzeptiert: boolean;
}): Promise<PartnerRahmenvertragAcceptResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  if (!opts.akzeptiert) {
    return {
      ok: false,
      error: "Bitte bestätige den Rahmenvertrag inkl. Anlage 1 und Anlage 2.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const akzeptiertAt = new Date().toISOString();
  const crm = await acceptCrmRahmenvertragLoggedIn();
  if (!crm.ok) {
    console.warn("[partner-vertrag] CRM Rahmenvertrag (eingeloggt):", crm.error);
  }

  const persisted = await persistPortalRahmenvertragAkzeptanz({
    handwerkerId: link.handwerkerId,
    authUserId: user.id,
    akzeptiertAt,
    vertragsNr: crm.ok ? crm.vertrags_nr : null,
    pdfUrl: crm.ok ? crm.pdf_url : null,
  });
  if (!persisted.ok) return { ok: false, error: persisted.error };

  await writeAuditEvent({
    entityType: "handwerker_vertraege",
    entityId: persisted.vertragId || opts.vertragId || link.handwerkerId,
    aktion: "rahmenvertrag_portal_akzeptiert",
    actorId: user.id,
    actorRolle: "handwerker",
    payload: {
      handwerker_id: link.handwerkerId,
      email: user.email,
      akzeptiert_at: akzeptiertAt,
      herkunft: "partner_portal_eingeloggt",
      vertrag_id: opts.vertragId,
      crm_ok: crm.ok,
    },
  });

  revalidatePath("/partner");
  return { ok: true };
}
