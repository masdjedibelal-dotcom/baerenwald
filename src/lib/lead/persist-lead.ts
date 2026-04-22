import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** CRM-Eingabe — kompatibel mit externem POST /api/lead und internem Funnel. */
export type PersistLeadInput = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  /** CRM-Feld; Alias: `nachricht` */
  notizen?: string | null;
  nachricht?: string | null;
  plz?: string | null;
  situation?: string | null;
  bereiche?: string[] | null;
  preis_min?: number | null;
  preis_max?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  zeitraum?: string | null;
  kundentyp?: string | null;
  /** Standard `website` → Bestätigungsmail wenn echte E-Mail */
  kanal?: string | null;
  funnel_daten?: unknown;
  /** Unterscheidung Rechner-Haupt / Beratung / Außerhalb / Komplex */
  funnel_quelle?:
    | "rechner_haupt"
    | "beratung"
    | "ausserhalb"
    | "komplex_rueckruf"
    | string;
};

export type PersistLeadResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status: number };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function syntheticEmailFromPhone(t: string): string {
  const digits = t.replace(/\D/g, "");
  const tail = digits.slice(-15) || "x";
  return `lead-${tail}@telefon.invalid`;
}

function buildKundeBestaetigung({
  name,
  situation,
  bereiche,
  preis_min,
  preis_max,
}: {
  name: string;
  situation?: string | null;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
}): string {
  const safeName = escapeHtml(name);
  const preisText =
    typeof preis_min === "number" &&
    typeof preis_max === "number" &&
    preis_min > 0 &&
    preis_max > 0
      ? `<p>Deine Preisindikation: <strong>${preis_min.toLocaleString("de-DE")} – ${preis_max.toLocaleString("de-DE")} €</strong></p>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E1E1E;">
  <img src="https://baerenwaldmuenchen.de/logo.png" height="40" alt="Bärenwald" style="margin-bottom: 24px"/>
  <h2 style="color: #2E7D52;">Hallo ${safeName},</h2>
  <p>vielen Dank für deine Anfrage. Wir haben alles erhalten und melden uns innerhalb von <strong>24 Stunden</strong> bei dir.</p>
  ${preisText}
  <p style="margin-top: 24px; padding: 16px; background: #EAF3DE; border-radius: 8px;">
    <strong>Dein nächster Schritt:</strong><br>
    Wir schauen uns deine Anfrage an und rufen dich zur Terminabsprache an.
  </p>
  <p style="margin-top: 32px; color: #888; font-size: 13px;">
    Bärenwald Handwerksgruppe München<br>
    baerenwaldmuenchen.de
  </p>
</body>
</html>`;
}

function buildInternNotification({
  lead_id,
  name,
  email,
  telefon,
  situation,
  bereiche,
  preis_min,
  preis_max,
  plz,
  nachricht,
}: {
  lead_id: string;
  name: string;
  email: string;
  telefon?: string;
  situation?: string | null;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
  plz?: string;
  nachricht?: string;
}): string {
  const dashboardBase =
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ?? "";
  const link =
    dashboardBase && lead_id
      ? `${dashboardBase}/anfragen/${encodeURIComponent(lead_id)}`
      : "#";
  const preisCell =
    typeof preis_min === "number" &&
    typeof preis_max === "number" &&
    preis_min > 0 &&
    preis_max > 0
      ? `${preis_min.toLocaleString("de-DE")} – ${preis_max.toLocaleString("de-DE")} €`
      : "—";

  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E1E1E;">
  <h2 style="color: #2E7D52;">Neue Anfrage eingegangen</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(name)}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">E-Mail</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(email)}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Telefon</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(telefon || "—")}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">PLZ</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(plz || "—")}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Situation</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(situation || "—")}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Bereiche</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(bereiche?.join(", ") || "—")}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Preisindikation</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(preisCell)}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Notizen</td><td style="padding: 8px;">${escapeHtml(nachricht || "—")}</td></tr>
  </table>
  <a href="${escapeHtml(link)}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #2E7D52; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Im Dashboard öffnen →</a>
</body>
</html>`;
}

function mergeFunnelDaten(
  funnel_daten: unknown,
  funnel_quelle: string | undefined
): unknown {
  const base =
    funnel_daten &&
    typeof funnel_daten === "object" &&
    !Array.isArray(funnel_daten)
      ? (funnel_daten as Record<string, unknown>)
      : {};
  return { ...base, funnel_quelle: funnel_quelle ?? "rechner_haupt" };
}

/**
 * Ein Lead in Supabase anlegen (Kunde, Lead, Status-Historie) + optional Resend.
 * Validierung: `name` Pflicht; mindestens eine Kontaktmöglichkeit (E-Mail oder Telefon, Telefon mind. 3 Zeichen).
 */
export async function persistLead(
  raw: PersistLeadInput
): Promise<PersistLeadResult> {
  try {
    return await persistLeadInner(raw);
  } catch (e) {
    console.error("[persistLead]", e);
    return { ok: false, error: "Interner Fehler", status: 500 };
  }
}

async function persistLeadInner(
  raw: PersistLeadInput
): Promise<PersistLeadResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase ist nicht konfiguriert (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
      status: 503,
    };
  }

  const name = (raw.name ?? "").trim();
  const emailRaw = (raw.email ?? "").trim();
  const telefon = (raw.telefon ?? "").trim();
  const notizen =
    (raw.notizen ?? raw.nachricht ?? "").trim() ||
    undefined;
  const situation = raw.situation ?? null;
  const bereiche = Array.isArray(raw.bereiche) ? raw.bereiche : [];
  const preis_min = raw.preis_min ?? raw.priceMin ?? 0;
  const preis_max = raw.preis_max ?? raw.priceMax ?? 0;
  const plz = (raw.plz ?? "").trim();
  const zeitraum = raw.zeitraum ?? null;
  const kundentyp = raw.kundentyp ?? null;
  const kanal = (raw.kanal ?? "website").trim() || "website";
  const funnel_quelle = raw.funnel_quelle ?? "rechner_haupt";
  const funnel_daten = mergeFunnelDaten(raw.funnel_daten, funnel_quelle);

  if (!name) {
    return { ok: false, error: "Name ist ein Pflichtfeld.", status: 400 };
  }

  const hasEmail = emailRaw.length > 0 && isValidEmail(emailRaw);
  const hasTel = telefon.length >= 3;
  if (!hasEmail && !hasTel) {
    return {
      ok: false,
      error:
        "Bitte mindestens eine gültige E-Mail oder eine Telefonnummer (mind. 3 Zeichen) angeben.",
      status: 400,
    };
  }

  const typ =
    situation === "gewerbe" || kundentyp === "gewerbe" ? "gewerbe" : "privat";

  const emailForKunde =
    hasEmail ? emailRaw.toLowerCase() : syntheticEmailFromPhone(telefon);

  let kunde_id: string | undefined;

  if (hasEmail) {
    const { data: byMail, error: errMail } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("email", emailRaw.toLowerCase())
      .maybeSingle();
    if (errMail) throw errMail;
    kunde_id = byMail?.id as string | undefined;
  }

  if (!kunde_id && hasTel) {
    const { data: byTel, error: errTel } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("telefon", telefon)
      .maybeSingle();
    if (errTel) throw errTel;
    kunde_id = byTel?.id as string | undefined;
  }

  if (!kunde_id) {
    const { data: neuerKunde, error: kundeError } = await supabaseAdmin
      .from("kunden")
      .insert({
        name,
        email: emailForKunde,
        telefon: telefon || null,
        plz: plz || null,
        typ,
      })
      .select("id")
      .single();

    if (kundeError) throw kundeError;
    kunde_id = neuerKunde.id as string;
  }

  const kontakt_email_row = hasEmail ? emailRaw.toLowerCase() : emailForKunde;

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .insert({
      kunde_id,
      kanal,
      status: "neu",
      situation,
      bereiche,
      preis_min,
      preis_max,
      plz: plz || null,
      zeitraum,
      kundentyp,
      funnel_daten,
      kontakt_name: name,
      kontakt_email: kontakt_email_row,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: notizen ?? null,
    })
    .select("id")
    .single();

  if (leadError) throw leadError;

  const leadId = String((lead as { id: string }).id);

  const { error: histError } = await supabaseAdmin
    .from("leads_status_history")
    .insert({
      lead_id: leadId,
      status_neu: "neu",
      notiz: "Lead via Website erstellt",
    });

  if (histError) {
    console.error("[persistLead] leads_status_history:", histError);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const internTo =
    process.env.INTERN_EMAIL?.trim() || SITE_CONFIG.email?.trim();
  const resendFromCustomer =
    process.env.RESEND_FROM_CUSTOMER ??
    "Bärenwald München <anfragen@baerenwaldmuenchen.de>";
  const resendFromSystem =
    process.env.RESEND_FROM_SYSTEM ??
    "System <system@baerenwaldmuenchen.de>";

  if (resendKey) {
    const resend = new Resend(resendKey);
    if (kanal === "website" && hasEmail) {
      try {
        await resend.emails.send({
          from: resendFromCustomer,
          to: emailRaw.toLowerCase(),
          subject: "Deine Anfrage ist bei uns eingegangen",
          html: buildKundeBestaetigung({
            name,
            situation,
            bereiche,
            preis_min,
            preis_max,
          }),
        });
      } catch (e) {
        console.error("[persistLead] Resend Kunde:", e);
      }
    }

    if (internTo) {
      try {
        await resend.emails.send({
          from: resendFromSystem,
          to: internTo,
          subject: `Neue Anfrage: ${name} — ${bereiche.join(", ") || "—"}`,
          html: buildInternNotification({
            lead_id: leadId,
            name,
            email: kontakt_email_row,
            telefon,
            situation,
            bereiche,
            preis_min,
            preis_max,
            plz,
            nachricht: notizen,
          }),
        });
      } catch (e) {
        console.error("[persistLead] Resend intern:", e);
      }
    }
  } else {
    console.warn("[persistLead] RESEND_API_KEY fehlt — keine E-Mails versendet");
  }

  return { ok: true, id: leadId };
}

