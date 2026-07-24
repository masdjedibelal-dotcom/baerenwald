import { Resend } from "resend";

import {
  buildStandardMailHtml,
  mailBegruessungHtml,
  mailPrimaryButtonHtml,
  mailTeamGrussHtml,
} from "@/lib/email/mail-shell";
import { partnerLoginUrl } from "@/lib/partner/partner-site-url";
import {
  partnerNotificationSubject,
  partnerNotificationVorgangKey,
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
  /**
   * Default true. false = nur In-App-Glocke, wenn eine spezialisierte
   * Partner-Mail (Zuweisung/Anfrage) parallel schon gesendet wird.
   */
  sendMail?: boolean;
};

function partnerNotifyBodyHtml(opts: {
  handwerkerName: string;
  subjectLine: string;
  portalUrl: string;
}): string {
  return `
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("du", opts.handwerkerName)}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;"><strong>${escapeHtml(opts.subjectLine)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">Bitte im Partner-Portal prüfen und bestätigen.</p>
    ${mailPrimaryButtonHtml("Zum Partner-Portal →", opts.portalUrl)}
    <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("du")}</p>
  `;
}

/** INSERT notification + optional Resend-Mail an Handwerker. */
export async function createPartnerNotification(
  input: PartnerNotifyInput
): Promise<{ ok: boolean; error?: string; notificationId?: string; deduplicated?: boolean }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const handwerkerId = input.handwerkerId.trim();
  if (!handwerkerId) return { ok: false, error: "handwerkerId fehlt." };

  const link = input.link.trim();
  if (!link) return { ok: false, error: "link fehlt." };

  const vorgangKey = partnerNotificationVorgangKey(link);

  if (vorgangKey) {
    const { data: existingRows } = await supabaseAdmin
      .from("notifications")
      .select("id, link")
      .eq("handwerker_id", handwerkerId)
      .eq("gelesen", false)
      .ilike("link", `%id=${vorgangKey}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    const existing = (existingRows ?? []).find(
      (row) => partnerNotificationVorgangKey(String(row.link ?? "")) === vorgangKey
    );

    if (existing?.id) {
      const { error: updErr } = await supabaseAdmin
        .from("notifications")
        .update({
          typ: input.typ,
          projekt_name: input.projektName.trim() || "Projekt",
          leistung_name: input.leistungName?.trim() || null,
          link,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updErr) return { ok: false, error: updErr.message };
      return { ok: true, notificationId: String(existing.id), deduplicated: true };
    }
  }

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

  const sendMail = input.sendMail !== false;
  const to = (hw as { email?: string | null } | null)?.email?.trim();
  const resend = resendClient();
  if (sendMail && to && resend) {
    const subject = partnerNotificationSubject(
      input.typ,
      input.projektName,
      input.leistungName
    );
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const portalUrl = link.startsWith("http") ? link : `${base}${link}`;
    const handwerkerName =
      (hw as { name?: string })?.name?.trim() || "Partner";
    const html = buildStandardMailHtml({
      preheader: subject,
      bodyHtml: partnerNotifyBodyHtml({
        handwerkerName,
        subjectLine: subject,
        portalUrl: portalUrl || partnerLoginUrl(),
      }),
      disclaimer:
        "Du erhältst diese Mail, weil dir im Partner-Portal ein Vorgang zugewiesen wurde.",
      footerNote: "Bärenwald München · Partner-Portal",
    });

    await resend.emails.send({
      from: systemFrom(),
      to,
      subject,
      html,
    });
  }

  return { ok: true, notificationId: String(inserted?.id ?? "") };
}
