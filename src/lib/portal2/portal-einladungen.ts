/**
 * Portal 2.0 E4 — Einladungs-Token (portal_einladungen).
 * Mail: nur mailto / HV-Branding — nie Bärenwald-Absender (D10/G5).
 */

import { SITE_CONFIG } from "@/lib/config";

export const PORTAL_EINLADUNG_EXPIRES_DAYS = 30;

export type PortalEinladungStatus =
  | "offen"
  | "eingeloest"
  | "abgelaufen"
  | "entfallen";

export type PortalEinladungRolle = "mieter" | "eigentuemer";

/** Kontaktdaten der Verwaltung für Mailto-Signatur. */
export type PortalEinladungHvBlock = {
  name?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  telefon?: string | null;
  email?: string | null;
};

function portalOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return SITE_CONFIG.url.replace(/\/$/, "");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** URL-sicheres Token (client- und server-tauglich). */
export function createPortalEinladungToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase64Url(bytes);
}

export function portalEinladungExpiresAt(
  from: Date = new Date(),
  days = PORTAL_EINLADUNG_EXPIRES_DAYS
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Registrierungs-Link (HV-Branding-Flow). */
export function buildPortalEinladungUrl(token: string): string {
  return `${portalOrigin()}/portal/einladung/${encodeURIComponent(token.trim())}`;
}

export function isPortalEinladungExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() < now.getTime();
}

export function resolvePortalEinladungStatus(row: {
  status: string;
  expires_at?: string | Date | null;
}): PortalEinladungStatus {
  const s = row.status as PortalEinladungStatus;
  if (s === "eingeloest" || s === "entfallen" || s === "abgelaufen") return s;
  if (isPortalEinladungExpired(row.expires_at)) return "abgelaufen";
  return "offen";
}

/** Firmendaten → Signatur-Block für Mailto (HV-Absender). */
export function portalEinladungHvFromKunde(kunde: {
  org_anzeigename?: string | null;
  name?: string | null;
  org_strasse?: string | null;
  org_hausnummer?: string | null;
  org_plz?: string | null;
  org_ort?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  org_telefon?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
  email?: string | null;
} | null | undefined): PortalEinladungHvBlock | null {
  if (!kunde) return null;
  const name =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || null;
  return {
    name,
    strasse: kunde.org_strasse?.trim() || kunde.strasse?.trim() || null,
    hausnummer:
      kunde.org_hausnummer?.trim() || kunde.hausnummer?.trim() || null,
    plz: kunde.org_plz?.trim() || kunde.plz?.trim() || null,
    ort: kunde.org_ort?.trim() || kunde.ort?.trim() || null,
    telefon:
      kunde.org_telefon?.trim() ||
      kunde.mieter_kontakt_telefon?.trim() ||
      null,
    email:
      kunde.mieter_kontakt_email?.trim() || kunde.email?.trim() || null,
  };
}

export function formatPortalEinladungHvSignature(
  hv: PortalEinladungHvBlock | null | undefined
): string {
  const name = hv?.name?.trim() || "Ihre Verwaltung";
  const street = [hv?.strasse?.trim(), hv?.hausnummer?.trim()]
    .filter(Boolean)
    .join(" ");
  const city = [hv?.plz?.trim(), hv?.ort?.trim()].filter(Boolean).join(" ");
  const tel = hv?.telefon?.trim();
  const mail = hv?.email?.trim();
  const lines = [name];
  if (street) lines.push(street);
  if (city) lines.push(city);
  if (tel) lines.push(`Tel. ${tel}`);
  if (mail) lines.push(mail);
  return lines.join("\n");
}

function einladungBodyMieter(opts: {
  hvName: string;
  where: string;
  link: string;
  signature: string;
}): string {
  return [
    "Guten Tag,",
    "",
    `hiermit laden wir Sie herzlich ein, Ihr Mieter-Konto in unserem Portal anzulegen und mit Ihrer Wohnung (${opts.where}) zu verknüpfen.`,
    "",
    "Im Portal können Sie Schäden und Anliegen direkt melden, den Bearbeitungsstand verfolgen und wichtige Informationen Ihrer Hausverwaltung jederzeit einsehen — klar, nachvollziehbar und ohne Umwege.",
    "",
    "Bitte nutzen Sie diesen persönlichen Link (zeitlich begrenzt):",
    opts.link,
    "",
    "Wir freuen uns, Sie digital anbinden zu dürfen.",
    "",
    "Viele Grüße",
    opts.signature,
  ].join("\n");
}

function einladungBodyEigentuemer(opts: {
  hvName: string;
  where: string;
  link: string;
  signature: string;
}): string {
  return [
    "Guten Tag,",
    "",
    `hiermit laden wir Sie herzlich ein, Ihr Eigentümer-Konto in unserem Portal anzulegen und mit Ihrer Einheit (${opts.where}) zu verknüpfen.`,
    "",
    "Im Portal behalten Sie Freigaben und Vorgänge im Blick, sehen den Stand der Bearbeitung und entscheiden dort, wo Ihre Zustimmung nötig ist — transparent und ohne Papierchaos.",
    "",
    "Bitte nutzen Sie diesen persönlichen Link (zeitlich begrenzt):",
    opts.link,
    "",
    "Wir freuen uns auf die Zusammenarbeit über das Portal.",
    "",
    "Viele Grüße",
    opts.signature,
  ].join("\n");
}

/**
 * mailto mit Empfänger + HV-Signatur — Absender = Mail-App der HV (D10).
 */
export function buildPortalEinladungMailto(opts: {
  link: string;
  hvName: string;
  objektLabel: string;
  einheitRef?: string | null;
  /** Empfänger — landet im An-Feld (wichtig für iOS Mail). */
  toEmail?: string | null;
  rolle?: PortalEinladungRolle | null;
  hv?: PortalEinladungHvBlock | null;
}): string {
  const hvName = opts.hvName.trim() || opts.hv?.name?.trim() || "Ihre Verwaltung";
  const objekt = opts.objektLabel.trim() || "Objekt";
  const we = opts.einheitRef?.trim();
  const where = we ? `${objekt} · ${we}` : objekt;
  const rolle: PortalEinladungRolle =
    opts.rolle === "eigentuemer" ? "eigentuemer" : "mieter";
  const signature = formatPortalEinladungHvSignature({
    name: hvName,
    strasse: opts.hv?.strasse,
    hausnummer: opts.hv?.hausnummer,
    plz: opts.hv?.plz,
    ort: opts.hv?.ort,
    telefon: opts.hv?.telefon,
    email: opts.hv?.email,
  });
  const bodyText =
    rolle === "eigentuemer"
      ? einladungBodyEigentuemer({
          hvName,
          where,
          link: opts.link,
          signature,
        })
      : einladungBodyMieter({
          hvName,
          where,
          link: opts.link,
          signature,
        });
  const rolleLabel = rolle === "eigentuemer" ? "Eigentümer" : "Mieter";
  const subj = encodeURIComponent(
    `Portal-Einladung (${rolleLabel}) — ${where}`
  );
  const body = encodeURIComponent(bodyText);
  const to = opts.toEmail?.trim() ?? "";
  const toPart = to ? encodeURIComponent(to) : "";
  return `mailto:${toPart}?subject=${subj}&body=${body}`;
}
