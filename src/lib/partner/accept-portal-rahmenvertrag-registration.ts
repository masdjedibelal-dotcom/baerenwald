import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { acceptCrmRahmenvertragForEmail } from "@/lib/partner/partner-crm-api";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { findHandwerkerForRegistration } from "@/lib/partner/partner-registration-eligibility";
import { persistPortalRahmenvertragAkzeptanz } from "@/lib/partner/persist-portal-rahmenvertrag";
import { isSupabaseConfigured } from "@/lib/supabase";

export type PortalRahmenvertragAcceptResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Rahmenvertrag-Annahme nach verifiziertem Besitz der Mailbox
 * (Partner-Registrierung: Funnel-OTP bestätigt).
 * Nicht als Server-Action exportieren — nur aus dem OTP-Bestätigungspfad.
 */
export async function acceptPortalRahmenvertragAfterVerifiedEmail(opts: {
  email: string;
  authUserId: string;
  /** Herkunft für Audit, z. B. partner_registrierung_otp */
  herkunft: string;
}): Promise<PortalRahmenvertragAcceptResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const email = opts.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "E-Mail fehlt." };
  if (!opts.authUserId.trim()) {
    return { ok: false, error: "Benutzer fehlt." };
  }

  const hw = await findHandwerkerForRegistration(email);
  if (!hw?.id) {
    return {
      ok: false,
      error: PARTNER_AUTH_COPY.errors.betriebNichtAngelegt,
    };
  }

  const akzeptiertAt = new Date().toISOString();
  const crm = await acceptCrmRahmenvertragForEmail(email);
  if (!crm.ok) {
    console.warn(
      "[acceptPortalRahmenvertragAfterVerifiedEmail] CRM:",
      crm.error
    );
  }

  const persisted = await persistPortalRahmenvertragAkzeptanz({
    handwerkerId: String(hw.id),
    authUserId: opts.authUserId,
    akzeptiertAt,
    vertragsNr: crm.ok ? crm.vertrags_nr : null,
    pdfUrl: crm.ok ? crm.pdf_url : null,
  });
  if (!persisted.ok) {
    return { ok: false, error: persisted.error };
  }

  await writeAuditEvent({
    entityType: "handwerker_vertraege",
    entityId: persisted.vertragId || String(hw.id),
    aktion: "rahmenvertrag_portal_akzeptiert",
    actorId: opts.authUserId,
    actorRolle: "handwerker",
    payload: {
      handwerker_id: String(hw.id),
      email,
      akzeptiert_at: akzeptiertAt,
      herkunft: opts.herkunft,
      crm_ok: crm.ok,
    },
  });

  return { ok: true };
}
