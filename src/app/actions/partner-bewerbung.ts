"use server";

import { headers } from "next/headers";
import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import { buildStandardMailHtml } from "@/lib/email/mail-shell";
import { sendBrandedMail } from "@/lib/email/send-branded-mail";
import { MARKE } from "@/lib/marke";
import { checkRateLimit } from "@/lib/rate-limit";

export type PartnerBewerbung = {
  firma: string;
  ansprechpartner: string;
  gewerk: string;
  einsatzgebiet: string;
  email: string;
  telefon: string;
  nachricht: string;
  datenschutz: boolean;
  /** Honeypot — bleibt bei Menschen leer */
  website: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Kurze Bewerbung von Handwerksbetrieben, die noch keine Partner sind — geht per E-Mail ans Büro. */
export async function sendePartnerBewerbung(
  b: PartnerBewerbung
): Promise<{ ok: true } | { ok: false; error: string }> {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  if (!checkRateLimit(ip, 5, 60 * 60 * 1000, "partner_bewerbung").allowed) {
    return { ok: false, error: "Zu viele Anfragen. Bitte rufen Sie uns an." };
  }
  if (b.website.trim()) return { ok: true };

  const f = {
    firma: b.firma.trim(),
    ansprechpartner: b.ansprechpartner.trim(),
    gewerk: b.gewerk.trim(),
    einsatzgebiet: b.einsatzgebiet.trim(),
    email: b.email.trim(),
    telefon: b.telefon.trim(),
    nachricht: b.nachricht.trim().slice(0, 2000),
  };
  if (f.firma.length < 2) return { ok: false, error: "Bitte geben Sie den Namen Ihres Betriebs an." };
  if (f.ansprechpartner.length < 2) return { ok: false, error: "Bitte geben Sie einen Ansprechpartner an." };
  if (f.gewerk.length < 2) return { ok: false, error: "Bitte geben Sie Ihr Gewerk an." };
  if (!f.email && !f.telefon) return { ok: false, error: "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an." };
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }
  if (!b.datenschutz) return { ok: false, error: "Bitte stimmen Sie der Datenschutzerklärung zu." };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Versand gerade nicht möglich. Bitte rufen Sie uns an." };
  const zeilen: [string, string][] = [
    ["Betrieb", f.firma],
    ["Ansprechpartner", f.ansprechpartner],
    ["Gewerk", f.gewerk],
    ["Einsatzgebiet", f.einsatzgebiet || "—"],
    ["E-Mail", f.email || "—"],
    ["Telefon", f.telefon || "—"],
  ];
  const html = buildStandardMailHtml({
    preheader: `Partnerbewerbung: ${f.firma}`,
    bodyHtml: `<p style="margin:0 0 12px;font-size:15px;">Neue Partnerbewerbung über die Website:</p>
<table style="border-collapse:collapse;font-size:14px;">${zeilen
      .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;">${esc(k)}</td><td style="padding:4px 0;">${esc(v)}</td></tr>`)
      .join("")}</table>${f.nachricht ? `<p style="margin:16px 0 0;font-size:14px;white-space:pre-line;">${esc(f.nachricht)}</p>` : ""}`,
  });
  const { error } = await sendBrandedMail(new Resend(apiKey), {
    from: process.env.RESEND_FROM ?? `${MARKE.name} <onboarding@resend.dev>`,
    to: SITE_CONFIG.email,
    ...(f.email ? { replyTo: f.email } : {}),
    subject: `Partnerbewerbung: ${f.firma} (${f.gewerk})`,
    html,
  });
  if (error) return { ok: false, error: "Senden hat nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an." };
  return { ok: true };
}
