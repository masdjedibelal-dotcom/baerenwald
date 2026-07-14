import { SITE_CONFIG } from "@/lib/config";
import { meldeBereichLabel } from "@/lib/org/melde-bereiche";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orgPortalDeepLink(portalPath?: string): string {
  const base = SITE_CONFIG.url.replace(/\/$/, "");
  const path =
    portalPath?.startsWith("/") ? portalPath : "/portal?section=freigabe";
  return `${base}${path}`;
}

const ZEITRAUM_LABELS: Record<string, string> = {
  sofort: "So bald wie möglich",
  diese_woche: "Diese Woche",
  flexibel: "Flexibel",
};

function zeitraumLabel(raw: string | null | undefined): string | undefined {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  return ZEITRAUM_LABELS[v] ?? v.replace(/_/g, " ");
}

function mailDataRow(label: string, value: string | undefined | null): string {
  const v = value?.trim();
  if (!v) return "";
  return `<tr>
  <td style="padding:8px 14px;font-size:12px;color:#6b7f74;vertical-align:top;width:130px;border-top:1px solid #eef0ee">${esc(label)}</td>
  <td style="padding:8px 14px;font-size:14px;color:#1a2420;vertical-align:top;border-top:1px solid #eef0ee">${esc(v)}</td>
</tr>`;
}

function mailSummaryTable(rows: string): string {
  if (!rows.trim()) return "";
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fafbfa">
${rows}
</table>`;
}

function portalButtonHtml(link: string): string {
  return `<p style="margin:24px 0 8px">
  <a href="${esc(link)}" style="display:inline-block;background:#1a3d2b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px">Zum Auftraggeber-Portal →</a>
</p>`;
}

export type OrgNeueMeldungMailInput = {
  objektTitel: string;
  melderName: string;
  melderEinheit?: string;
  melderTelefon?: string;
  melderEmail?: string;
  kategorie: string;
  bereichId?: string;
  beschreibung?: string;
  fotoCount?: number;
  dringlichkeit?: string | null;
  /** mieter = Meldeformular · hausverwaltung = HV hat selbst erfasst */
  quelle?: "mieter" | "hausverwaltung";
  portalPath?: string;
  referenz?: string;
  /** Status-Link zum Weitergeben an den Mieter (kein Mieter-Mail-Versand). */
  mieterStatusLink?: string;
};

export function buildOrgNeueMeldungSubject(objektTitel: string): string {
  const obj = objektTitel.trim() || "Objekt";
  return `Neuer Vorgang — ${obj}`;
}

/** M2 — HV: neuer Vorgang (Mieter-Meldung oder HV-Direkt) */
export function buildOrgNeueMeldungHtml(input: OrgNeueMeldungMailInput): string {
  const kat = meldeKategorieLabel(input.kategorie);
  const bereich = meldeBereichLabel(input.bereichId);
  const link = orgPortalDeepLink(input.portalPath);
  const quelle = input.quelle ?? "mieter";
  const einleitung =
    quelle === "hausverwaltung"
      ? `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang von Ihrer Hausverwaltung erfasst.`
      : `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang durch eine <strong>Mieter-Meldung</strong> erstellt.`;

  const kontakt = [input.melderEmail?.trim(), input.melderTelefon?.trim()]
    .filter(Boolean)
    .join(" · ");

  const rows = [
    mailDataRow("Art", kat),
    mailDataRow("Bereich", bereich),
    mailDataRow(
      "Melder",
      input.melderEinheit?.trim()
        ? `${input.melderName} (${input.melderEinheit.trim()})`
        : input.melderName
    ),
    mailDataRow("Kontakt", kontakt || undefined),
    mailDataRow("Dringlichkeit", zeitraumLabel(input.dringlichkeit)),
    mailDataRow(
      "Fotos",
      input.fotoCount != null && input.fotoCount > 0
        ? `${input.fotoCount} Bild${input.fotoCount === 1 ? "" : "er"}`
        : undefined
    ),
    mailDataRow("Beschreibung", input.beschreibung),
    mailDataRow("Referenz", input.referenz),
    mailDataRow("Mieter-Status-Link", input.mieterStatusLink),
  ].join("");

  const mieterHinweis = input.mieterStatusLink
    ? `<p style="font-size:14px;color:#374151;margin-top:16px"><strong>Mieter-Status:</strong> Es geht keine E-Mail an den Mieter. Bitte geben Sie den Status-Link selbst weiter (SMS, Anruf, WhatsApp):<br/><a href="${esc(input.mieterStatusLink)}">${esc(input.mieterStatusLink)}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Guten Tag,</p>
  <p>${einleitung}</p>
  ${mailSummaryTable(rows)}
  <p style="font-size:14px;color:#374151">Bitte prüfen Sie den Vorgang im Auftraggeber-Portal und wählen Sie den nächsten Schritt (z.&nbsp;B. Angebot einfordern oder Kleinreparatur).</p>
  ${mieterHinweis}
  ${portalButtonHtml(link)}
  <p style="color:#6b7f74;font-size:13px;margin-top:8px">Status: Neu · Bereich Meldungen</p>
</body>
</html>`;
}

/** @deprecated Mieter-Mail-Versand deaktiviert — nur HV-Benachrichtigung. */
export function buildMelderBestaetigungHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
  kategorie: string;
  referenz?: string;
  statusLink?: string;
  introNote?: string;
  footerNote?: string;
}): string {
  const kat = meldeKategorieLabel(input.kategorie);
  const statusBlock = input.statusLink
    ? `<p style="margin:20px 0"><a href="${esc(input.statusLink)}" style="display:inline-block;background:#1a5c3a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Status verfolgen</a></p>`
    : "";
  const intro =
    input.introNote?.trim() ||
    `${esc(input.orgName)} bearbeitet Ihre Meldung und meldet sich zum nächsten Schritt.`;
  const footer =
    input.footerNote?.trim() ||
    `Bei Rückfragen wenden Sie sich an ${esc(input.orgName)}.`;
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>wir haben deine <strong>${esc(kat)}</strong>-Meldung für <strong>${esc(input.objektTitel)}</strong> erhalten.</p>
  <p>${intro}</p>
  ${statusBlock}
  ${input.referenz ? `<p style="color:#6b7f74;font-size:14px">Referenz: ${esc(input.referenz)}</p>` : ""}
  <p style="margin-top:24px;color:#6b7f74;font-size:13px">${footer}</p>
  <p style="margin-top:16px">Herzliche Grüße<br/>${esc(input.orgName)}</p>
</body>
</html>`;
}

export function buildMelderBestaetigungSubject(kategorie: string): string {
  return `Meldung eingegangen — ${meldeKategorieLabel(kategorie)}`;
}

/** M3 — HV: Angebot eingefordert (Bestätigung) */
export function buildOrgAngebotEingefordertHtml(input: {
  orgName: string;
  objektTitel: string;
  melderName?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Angebot eingefordert</p>
  <p>Für <strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` (${esc(input.melderName)})` : ""} erstellt Bärenwald ein Angebot. Sie sehen es im Portal, sobald es vorliegt.</p>
  ${portalButtonHtml(link)}
</body>
</html>`;
}

/** M5 — Mieter: Einladung zur Ergänzung */
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

/** M6 — Mieter: Meldung abgelehnt */
export function buildMelderAbgelehntHtml(input: {
  melderName: string;
  orgName: string;
  objektTitel: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Hallo ${esc(input.melderName)},</p>
  <p>${esc(input.orgName)} hat deine Meldung für <strong>${esc(input.objektTitel)}</strong> ohne Beauftragung abgeschlossen.</p>
  <p>Bei Rückfragen wende dich bitte direkt an deine Hausverwaltung.</p>
</body>
</html>`;
}

/** M7 — HV: Kleinreparatur freigegeben */
export function buildOrgKleinreparaturHtml(input: {
  objektTitel: string;
  melderName?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Kleinreparatur freigegeben</p>
  <p><strong>${esc(input.objektTitel)}</strong>${input.melderName ? ` · ${esc(input.melderName)}` : ""} — Bärenwald koordiniert die Ausführung ohne formales Angebot.</p>
  ${portalButtonHtml(link)}
</body>
</html>`;
}

/** M8 — HV: Angebot zur Freigabe (nur Mieter-Schäden) */
export function buildOrgAngebotFreigabeHtml(input: {
  objektTitel: string;
  betrag?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Angebot wartet auf Freigabe</p>
  <p>Für <strong>${esc(input.objektTitel)}</strong>${input.betrag ? ` (${esc(input.betrag)})` : ""} liegt ein Angebot vor. Bitte im Portal freigeben oder ablehnen.</p>
  ${portalButtonHtml(link)}
</body>
</html>`;
}

/** HV: Ereignis, das früher an den Mieter ging — inkl. optional Status-Link zum Weitergeben. */
export function buildOrgHvMieterEventHtml(input: {
  objektTitel: string;
  melderName?: string;
  eventTitel: string;
  eventBody: string;
  mieterStatusLink?: string;
  portalPath?: string;
}): string {
  const link = orgPortalDeepLink(input.portalPath);
  const melder = input.melderName?.trim()
    ? ` (${esc(input.melderName.trim())})`
    : "";
  const statusBlock = input.mieterStatusLink
    ? `<p style="margin:16px 0;font-size:14px"><strong>Mieter-Status-Link</strong> (bitte selbst weitergeben):<br/><a href="${esc(input.mieterStatusLink)}">${esc(input.mieterStatusLink)}</a></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1a2420;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <p>Guten Tag,</p>
  <p><strong>${esc(input.eventTitel)}</strong> — <strong>${esc(input.objektTitel)}</strong>${melder}</p>
  <p>${esc(input.eventBody)}</p>
  ${statusBlock}
  ${portalButtonHtml(link)}
  <p style="color:#6b7f74;font-size:13px;margin-top:8px">Es geht keine E-Mail an den Mieter. Bitte koordinieren Sie Rückfragen und Termine direkt.</p>
</body>
</html>`;
}
