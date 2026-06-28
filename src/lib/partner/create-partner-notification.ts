import { Resend } from "resend";

import { partnerLoginUrl } from "@/lib/partner/partner-site-url";
import {
  partnerNotificationSubject,
  type PartnerNotificationTyp,
} from "@/lib/partner/partner-notifications";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function systemFrom(): string {
  return (
    process.env.RESEND_FROM_SYSTEM?.trim() ??
    "Bärenwald System <system@baerenwaldmuenchen.de>"
  );
}

export type PartnerNotifyInput = {
  handwerkerId: string;
  typ: PartnerNotificationTyp;
  projektName: string;
  leistungName?: string | null;
  link: string;
};

/** INSERT notification + optional Resend-Mail an Handwerker. */
export async function createPartnerNotification(
  input: PartnerNotifyInput
): Promise<{ ok: boolean; error?: string; notificationId?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const handwerkerId = input.handwerkerId.trim();
  if (!handwerkerId) return { ok: false, error: "handwerkerId fehlt." };

  const link = input.link.trim();
  if (!link) return { ok: false, error: "link fehlt." };

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("notifications")
    .insert({
      handwerker_id: handwerkerId,
      typ: input.typ,
      projekt_name: input.projektName.trim() || "Projekt",
      leistung_name: input.leistungName?.trim() || null,
      link,
      gelesen: false,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("email, name")
    .eq("id", handwerkerId)
    .maybeSingle();

  const to = (hw as { email?: string | null } | null)?.email?.trim();
  const resend = resendClient();
  if (to && resend) {
    const subject = partnerNotificationSubject(
      input.typ,
      input.projektName,
      input.leistungName
    );
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const portalUrl = link.startsWith("http") ? link : `${base}${link}`;
    const html = `<!DOCTYPE html><html lang="de"><body style="font-family:Arial,sans-serif;">
<p>Hallo ${escapeHtml((hw as { name?: string })?.name?.trim() || "Partner")},</p>
<p>${escapeHtml(subject)}</p>
<p><a href="${escapeHtml(portalUrl || partnerLoginUrl())}" style="display:inline-block;background:#2E7D52;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Zum Partner-Portal</a></p>
<p style="font-size:12px;color:#666;">Bärenwald München · Partner-Portal</p>
</body></html>`;

    await resend.emails.send({
      from: systemFrom(),
      to,
      subject,
      html,
    });
  }

  return { ok: true, notificationId: String(inserted?.id ?? "") };
}
