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

function schedulePartnerPush(input: {
  handwerkerId: string;
  typ: PartnerNotificationTyp;
  projektName: string;
  leistungName?: string | null;
  link: string;
}): void {
  void import("@/lib/push/resolve-recipients")
    .then(async ({ resolveHandwerkerAuthUserId }) => {
      const { buildPushPayloadFromNotif } = await import("@/lib/push/payload");
      const { scheduleWebPushToUsers } = await import(
        "@/lib/push/send-web-push"
      );
      const uid = await resolveHandwerkerAuthUserId(input.handwerkerId);
      if (!uid) return;
      const subject = partnerNotificationSubject(
        input.typ,
        input.projektName,
        input.leistungName
      );
      scheduleWebPushToUsers(
        [uid],
        buildPushPayloadFromNotif({
          typ: input.typ,
          titel: subject,
          body: /rechnung\s+wurde\s+überwiesen/i.test(String(input.leistungName ?? ""))
            ? "Deine Rechnung wurde überwiesen."
            : "Bitte im Partner-Portal prüfen.",
          link: input.link,
          defaultUrl: "/partner",
        })
      );
    })
    .catch((e) => console.error("[createPartnerNotification] push:", e));
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
  bautagebuch?: boolean;
  rechnungUeberwiesen?: boolean;
}): string {
  const ctaHint = opts.rechnungUeberwiesen
    ? "Deine eingereichte Rechnung wurde von Bärenwald überwiesen."
    : opts.bautagebuch
      ? "Bitte im Partner-Portal einen Bautagebuch-Eintrag erstellen — am Auftrag hat sich nichts geändert."
      : "Bitte im Partner-Portal prüfen und bestätigen.";
  const ctaLabel = opts.rechnungUeberwiesen
    ? "Zum Vorgang im Partner-Portal →"
    : "Zum Partner-Portal →";
  return `
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${mailBegruessungHtml("du", opts.handwerkerName)}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;"><strong>${escapeHtml(opts.subjectLine)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${ctaHint}</p>
    ${mailPrimaryButtonHtml(ctaLabel, opts.portalUrl)}
    <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.6;">${mailTeamGrussHtml("du")}</p>
  `;
}

function isRechnungUeberwiesenNotify(
  typ: PartnerNotificationTyp,
  leistungName?: string | null
): boolean {
  return (
    typ === "erinnerung" &&
    /rechnung\s+wurde\s+überwiesen/i.test(String(leistungName ?? ""))
  );
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
  const isBautagebuchNotify =
    input.typ === "bautagebuch" ||
    (input.typ === "erinnerung" &&
      /bitte\s+update\s+geben|bautagebuch|focus=bautagebuch/i.test(
        `${input.leistungName ?? ""} ${link}`
      ));
  const notifyTyp: PartnerNotificationTyp = isBautagebuchNotify
    ? "bautagebuch"
    : input.typ;

  const rechnungUeberwiesen = isRechnungUeberwiesenNotify(
    notifyTyp,
    input.leistungName
  );

  /**
   * Partner-Glocke/Push: neue Zuweisung (Annehmen/Ablehnen) +
   * Zahlungsmeldung „Rechnung wurde überwiesen“.
   * Andere Typen (geaendert, bautagebuch, …) erzeugen keine Notification mehr.
   */
  if (notifyTyp !== "neu" && !rechnungUeberwiesen) {
    return { ok: true, deduplicated: true };
  }

  if (vorgangKey && notifyTyp === "neu") {
    // Einmalig je Vorgang — auch wenn bereits gelesen (kein Spam bei erneutem Login)
    const { data: existingAny } = await supabaseAdmin
      .from("notifications")
      .select("id, link, typ")
      .eq("handwerker_id", handwerkerId)
      .eq("typ", "neu")
      .ilike("link", `%id=${vorgangKey}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    const existingNeu = (existingAny ?? []).find(
      (row) =>
        partnerNotificationVorgangKey(String(row.link ?? "")) === vorgangKey
    );

    if (existingNeu?.id) {
      return {
        ok: true,
        notificationId: String(existingNeu.id),
        deduplicated: true,
      };
    }
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("notifications")
    .insert({
      handwerker_id: handwerkerId,
      typ: notifyTyp,
      projekt_name: input.projektName.trim() || "Projekt",
      leistung_name: input.leistungName?.trim() || null,
      link,
      gelesen: false,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };

  void schedulePartnerPush({
    handwerkerId,
    typ: notifyTyp,
    projektName: input.projektName,
    leistungName: input.leistungName,
    link,
  });

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
      notifyTyp,
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
        rechnungUeberwiesen,
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
