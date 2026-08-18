import { createHash, randomInt } from "crypto";
import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const FUNNEL_OTP_TTL_MS = 15 * 60 * 1000;
export const FUNNEL_OTP_MAX_ATTEMPTS = 5;

export function hashFunnelOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function generateFunnelOtpCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export async function isPortalAuthEmailRegistered(
  email: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const norm = normalizeKundenEmail(email);
  if (!norm) return false;

  const { data, error } = await supabaseAdmin.rpc(
    "portal_auth_email_registered",
    { p_email: norm }
  );
  if (error) {
    console.error("[isPortalAuthEmailRegistered]", error.message);
    // Fallback: kunden mit auth_user_id
    const { data: row } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .ilike("email", norm)
      .not("auth_user_id", "is", null)
      .limit(1)
      .maybeSingle();
    return Boolean(row?.id);
  }
  return Boolean(data);
}

export async function storeFunnelOtp(opts: {
  email: string;
  code: string;
  userId: string;
}): Promise<void> {
  const email = normalizeKundenEmail(opts.email);
  if (!email) throw new Error("Ungültige E-Mail.");
  const expiresAt = new Date(Date.now() + FUNNEL_OTP_TTL_MS).toISOString();
  const { error } = await supabaseAdmin.from("funnel_portal_otp").upsert(
    {
      email,
      code_hash: hashFunnelOtpCode(opts.code),
      user_id: opts.userId,
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) throw new Error(error.message);
}

export type VerifyFunnelOtpResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function verifyFunnelOtp(opts: {
  email: string;
  code: string;
}): Promise<VerifyFunnelOtpResult> {
  const email = normalizeKundenEmail(opts.email);
  const code = opts.code.trim();
  if (!email || !/^\d{4}$/.test(code)) {
    return { ok: false, error: "Bitte den 4-stelligen Code eingeben." };
  }

  const { data: row, error } = await supabaseAdmin
    .from("funnel_portal_otp")
    .select("code_hash, user_id, expires_at, attempts")
    .eq("email", email)
    .maybeSingle();

  if (error || !row) {
    return {
      ok: false,
      error: "Kein Code gefunden. Bitte erneut senden.",
    };
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await supabaseAdmin.from("funnel_portal_otp").delete().eq("email", email);
    return {
      ok: false,
      error: "Code abgelaufen. Bitte einen neuen Code anfordern.",
    };
  }

  const attempts = Number(row.attempts ?? 0);
  if (attempts >= FUNNEL_OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      error: "Zu viele Fehlversuche. Bitte einen neuen Code anfordern.",
    };
  }

  if (hashFunnelOtpCode(code) !== row.code_hash) {
    await supabaseAdmin
      .from("funnel_portal_otp")
      .update({ attempts: attempts + 1 })
      .eq("email", email);
    return { ok: false, error: "Code ungültig. Bitte erneut versuchen." };
  }

  const userId = String(row.user_id ?? "");
  if (!userId) {
    return { ok: false, error: "Konto nicht gefunden." };
  }

  const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  );
  if (confirmErr) {
    return { ok: false, error: confirmErr.message };
  }

  await supabaseAdmin.from("funnel_portal_otp").delete().eq("email", email);
  return { ok: true, userId };
}

export async function sendFunnelOtpEmail(opts: {
  email: string;
  code: string;
  vorname?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn("[sendFunnelOtpEmail] RESEND_API_KEY fehlt");
    return {
      ok: false,
      error: "E-Mail-Versand ist momentan nicht verfügbar. Bitte später erneut.",
    };
  }

  const from =
    process.env.RESEND_FROM_SYSTEM ??
    "MeinBärenwald <system@baerenwaldmuenchen.de>";
  const name = (opts.vorname ?? "").trim() || "du";
  const resend = new Resend(resendKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: opts.email.trim().toLowerCase(),
      subject: `${opts.code} — dein MeinBärenwald Bestätigungscode`,
      html: `
        <p>Hallo ${escapeHtml(name)},</p>
        <p>dein Bestätigungscode für MeinBärenwald:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#2E7D52;">${escapeHtml(opts.code)}</p>
        <p>Der Code ist 15 Minuten gültig.</p>
        <p style="color:#6b7280;font-size:13px;">${escapeHtml(SITE_CONFIG.companyName)} · ${escapeHtml(SITE_CONFIG.addressLine)}</p>
      `,
    });
    if (error) {
      console.error("[sendFunnelOtpEmail]", error);
      return { ok: false, error: "Code-Mail konnte nicht gesendet werden." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[sendFunnelOtpEmail]", e);
    return { ok: false, error: "Code-Mail konnte nicht gesendet werden." };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
