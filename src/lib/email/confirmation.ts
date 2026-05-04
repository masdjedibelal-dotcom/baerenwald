/**
 * HTML-Bestätigungsmail an Kundinnen (inline CSS für gängige Clients).
 */

import { SITE_CONFIG } from "@/lib/config";
import { lineLeistungsLabel } from "@/lib/funnel/breakdown-labels";
import type { PriceLineItem } from "@/lib/funnel/types";

export type ConfirmationEmailInput = {
  vorname: string;
  situation: string;
  bereiche: string[];
  priceMin?: number;
  priceMax?: number;
  /** Nur in der E-Mail: detaillierte Aufschlüsselung (ab 2 Zeilen). */
  breakdown?: PriceLineItem[];
  wunschtermin?: { date: string; time: string } | null;
  plz: string;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSlotDe(
  slot: { date: string; time: string } | null | undefined
): string {
  if (!slot?.date || !slot?.time) return "";
  try {
    const d = new Date(slot.date);
    if (Number.isNaN(d.getTime())) return `${slot.date} · ${slot.time}`;
    const datum = d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${datum} · ${slot.time}`;
  } catch {
    return `${slot.date} · ${slot.time}`;
  }
}

function buildBreakdownTableHtml(
  breakdown: PriceLineItem[],
  priceMin: number,
  priceMax: number
): string {
  const rows = breakdown
    .map((item) => {
      const label = escHtml(lineLeistungsLabel(item));
      const min = item.min.toLocaleString("de-DE");
      const max = item.max.toLocaleString("de-DE");
      return `<tr style="border-bottom:1px solid #f0f0f0;">
<td style="padding:10px 0;font-size:14px;">${label}</td>
<td style="padding:10px 0;font-size:14px;text-align:right;font-weight:600;">${min} – ${max} €</td>
</tr>`;
    })
    .join("");

  const totalMin = priceMin.toLocaleString("de-DE");
  const totalMax = priceMax.toLocaleString("de-DE");

  return `<hr style="border:none;border-top:1px solid #d5d8d3;margin:18px 0;"/>
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.04em;color:#6b6560;text-transform:uppercase;">
  Aufschlüsselung nach Gewerk
</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <thead>
    <tr style="border-bottom:2px solid #eee;">
      <th style="text-align:left;padding:8px 0;font-size:12px;color:#999;">Gewerk</th>
      <th style="text-align:right;padding:8px 0;font-size:12px;color:#999;">Richtwert</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr>
      <td style="padding:12px 0 0;font-weight:700;font-size:15px;">Gesamt</td>
      <td style="padding:12px 0 0;font-weight:700;font-size:15px;text-align:right;color:#2E7D52;">${totalMin} – ${totalMax} €</td>
    </tr>
  </tbody>
</table>
<p style="font-size:11px;color:#999;margin-top:8px;line-height:1.45;">
  Diese Aufschlüsselung ist vertraulich und nur für Sie bestimmt. Dieser
  Preisrahmen basiert auf unserer Projekterfahrung in München. Das verbindliche
  Festpreisangebot erhalten Sie nach dem Vor-Ort-Termin.
</p>`;
}

export function generateConfirmationEmail(
  input: ConfirmationEmailInput
): string {
  const vorname = (input.vorname ?? "").trim() || "Kundin/Kunde";
  const situation = (input.situation ?? "—").trim() || "—";
  const bereiche =
    input.bereiche?.length > 0
      ? input.bereiche.join(", ")
      : "—";
  const plz = (input.plz ?? "").trim() || "—";
  const hasPreis =
    typeof input.priceMin === "number" &&
    typeof input.priceMax === "number" &&
    input.priceMin > 0 &&
    input.priceMax > 0;
  const preisZeile = hasPreis
    ? `${input.priceMin!.toLocaleString("de-DE")} – ${input.priceMax!.toLocaleString("de-DE")} €`
    : "";
  const slotText = formatSlotDe(input.wunschtermin ?? null);

  const box =
    "margin:0 0 14px;padding:14px 16px;background:#f6f7f5;border-radius:10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e1c1a;";
  const hRule =
    "border:none;border-top:1px solid #d5d8d3;margin:18px 0;";
  const small =
    "font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#5c5a57;";
  const li =
    "font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#1e1c1a;margin:0 0 8px;padding-left:4px;";

  const preisBlock = hasPreis
    ? `<p style="margin:0 0 6px;"><strong>Preisrahmen:</strong> ${escHtml(preisZeile)}<br/><span style="font-size:12px;color:#5c5a57;">(Basiert auf unserer Projekterfahrung in München — verbindliches Festpreisangebot nach Vor-Ort-Termin)</span></p>`
    : "";

  const breakdownBlock =
    hasPreis &&
    input.breakdown &&
    input.breakdown.length > 1 &&
    typeof input.priceMin === "number" &&
    typeof input.priceMax === "number"
      ? buildBreakdownTableHtml(
          input.breakdown,
          input.priceMin,
          input.priceMax
        )
      : "";

  const terminBlock =
    slotText.length > 0
      ? `<p style="margin:8px 0 0;"><strong>Wunschtermin:</strong> ${escHtml(slotText)}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:24px;background:#ffffff;">
  <div style="max-width:560px;margin:0 auto;">
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1e1c1a;">
      Hallo ${escHtml(vorname)},
    </p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1e1c1a;">
      vielen Dank für deine Anfrage. Wir haben alles erhalten und melden uns innerhalb von <strong>48h</strong> zur Terminbestätigung.
    </p>
    <hr style="${hRule}"/>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.02em;color:#2e7d52;text-transform:uppercase;">
      Deine Angaben im Überblick
    </p>
    <div style="${box}">
      <p style="margin:0 0 6px;"><strong>Vorhaben:</strong> ${escHtml(situation)}</p>
      <p style="margin:0 0 6px;"><strong>Bereich:</strong> ${escHtml(bereiche)}</p>
      ${preisBlock}
      ${terminBlock}
      <p style="margin:${slotText || hasPreis ? "8px" : "0"} 0 0;"><strong>PLZ:</strong> ${escHtml(plz)}</p>
    </div>
    ${breakdownBlock}
    <hr style="${hRule}"/>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1e1c1a;">
      Was als Nächstes passiert:
    </p>
    <ol style="margin:0;padding:0 0 0 20px;">
      <li style="${li}">Wir prüfen die Verfügbarkeit</li>
      <li style="${li}">Wir melden uns per Telefon oder E-Mail zur Bestätigung</li>
      <li style="${li}">Vor-Ort-Termin — wir schauen uns alles an</li>
      <li style="${li}">Festpreisangebot nach Termin</li>
    </ol>
    <p style="margin:18px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e1c1a;">
      Bei Fragen erreichst du uns:
    </p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#1e1c1a;">
      Telefon: <a href="${escHtml(SITE_CONFIG.phoneHref)}" style="color:#2e7d52;">${escHtml(SITE_CONFIG.phone)}</a><br/>
      E-Mail: <a href="mailto:info@baerenwald-muenchen.de" style="color:#2e7d52;">info@baerenwald-muenchen.de</a>
    </p>
    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e1c1a;">
      <strong>Bärenwald München</strong><br/>
      Bärenwaldstraße 20<br/>
      81737 München
    </p>
    <hr style="${hRule}"/>
    <p style="${small}">
      Dieser Preisrahmen basiert auf unserer Projekterfahrung in München. Das
      verbindliche Festpreisangebot erhalten Sie nach dem Vor-Ort-Termin.
    </p>
  </div>
</body>
</html>`;
}
