import { SITE_CONFIG } from "@/lib/config";
import { buildMeldeVorgangTitel } from "@/lib/org/melde-vorgang-titel";
import { withPortalDetailDeepLink } from "@/lib/portal2/portal-detail-deep-link";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

/**
 * Optionale Mail an HM-Kontakt-E-Mail mit Link ins HV-Portal (kein Token).
 */
export async function notifyHausmeisterPruefung(input: {
  leadId: string;
  toEmail: string;
  kontaktName?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; skipped?: boolean }> {
  const to = input.toEmail.trim();
  if (!isValidEmail(to)) {
    return { ok: false, error: "Keine gültige HM-E-Mail.", skipped: true };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: "RESEND_API_KEY fehlt.", skipped: true };
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, funnel_daten, kontakt_nachricht, notizen, melder_name, melder_einheit, kunde_objekt_id"
    )
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Lead nicht gefunden." };

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  const vorgangTitel = buildMeldeVorgangTitel({
    situation: lead.situation as string | null,
    bereiche: (lead.bereiche as string[] | null) ?? null,
    funnelDaten: lead.funnel_daten,
    beschreibung:
      (lead.kontakt_nachricht as string | null) ??
      (lead.notizen as string | null) ??
      null,
  });

  const portalPath = withPortalDetailDeepLink(
    `/portal?section=vorgaenge&id=${encodeURIComponent(input.leadId)}`,
    "hm_pruefung"
  );
  const portalUrl = `${SITE_CONFIG.url.replace(/\/$/, "")}${portalPath}`;

  const name = (input.kontaktName ?? "").trim() || "Hausmeister";
  const melder = String(lead.melder_name ?? "").trim();
  const einheit = String(lead.melder_einheit ?? "").trim();
  const wer = [melder || null, einheit ? `WE ${einheit}` : null]
    .filter(Boolean)
    .join(" · ");

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_SYSTEM ??
        "System <system@baerenwaldmuenchen.de>",
      to,
      subject: `Hausmeister-Prüfung — ${objektTitel}`,
      html: `<p>Hallo ${escapeHtml(name)},</p>
<p>für <strong>${escapeHtml(objektTitel)}</strong> steht eine Hausmeister-Prüfung an${
        vorgangTitel ? `: <em>${escapeHtml(vorgangTitel)}</em>` : ""
      }${wer ? ` (${escapeHtml(wer)})` : ""}.</p>
<p>Bitte im Verwaltungs-Portal prüfen und dokumentieren:</p>
<p><a href="${escapeHtml(portalUrl)}">Zum Vorgang im Portal</a></p>
<p>Sie melden sich mit dem bestehenden Verwaltungs-Zugang an.</p>`,
    });
    return { ok: true };
  } catch (e) {
    console.error("[notifyHausmeisterPruefung]", e);
    return { ok: false, error: "HM-Mail fehlgeschlagen." };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
