import { SITE_CONFIG } from "@/lib/config";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMelderBestaetigungHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
  kategorie: string;
  referenz?: string;
}): string {
  const kat = meldeKategorieLabel(input.kategorie);
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>wir haben deine <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
  <p>${esc(input.orgName)} und Bärenwald koordinieren den nächsten Schritt. Du hörst von uns — oder registriere dich bei MeinBärenwald mit derselben E-Mail, um den Status zu verfolgen.</p>
  ${input.referenz ? `<p style="color:#6b7f74;font-size:14px">Referenz: ${esc(input.referenz)}</p>` : ""}
  <p style="margin-top:24px">Herzliche Grüße<br/>${esc(SITE_CONFIG.companyName)}</p>
</body>
</html>`;
}

export function buildMelderBestaetigungSubject(kategorie: string): string {
  return `Meldung eingegangen — ${meldeKategorieLabel(kategorie)}`;
}

export function buildOrgNeueMeldungHtml(input: {
  orgName: string;
  objektTitel: string;
  melderName: string;
  melderEinheit?: string;
  kategorie: string;
  beschreibung?: string;
}): string {
  const kat = meldeKategorieLabel(input.kategorie);
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Neue Meldung für <strong>${esc(input.orgName)}</strong></p>
  <p><strong>Objekt:</strong> ${esc(input.objektTitel)}<br/>
  <strong>Melder:</strong> ${esc(input.melderName)}${input.melderEinheit ? ` (${esc(input.melderEinheit)})` : ""}<br/>
  <strong>Kategorie:</strong> ${esc(kat)}</p>
  ${input.beschreibung ? `<p>${esc(input.beschreibung)}</p>` : ""}
  <p>Im Auftraggeber-Portal unter <strong>Eingang</strong> einsehbar.</p>
</body>
</html>`;
}

export function buildMelderEinladungHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
  link: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>${esc(input.orgName)} hat eine Meldung für <strong>${esc(input.objektTitel)}</strong> vorgemerkt. Bitte ergänze kurz Details und Fotos:</p>
  <p><a href="${esc(input.link)}" style="display:inline-block;background:#1a3d2b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Meldung ergänzen</a></p>
  <p style="color:#6b7f74;font-size:14px">Link: ${esc(input.link)}</p>
</body>
</html>`;
}
