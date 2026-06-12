import {
  formatAnfrageStrasseHausnummer,
  resolveAnfrageNachname,
  resolveAnfrageVorname,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import { objektPlzOrt } from "@/lib/portal/portal-detail-item";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";

export type PortalContactPrefill = {
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
  plz?: string;
  ort?: string;
  strasse?: string;
  hausnummer?: string;
};

type PortalKundeSource = {
  name?: string | null;
  email?: string | null;
  plz?: string | null;
  ort?: string | null;
  adresse?: string | null;
};

function splitName(name?: string | null): { vorname?: string; nachname?: string } {
  const raw = name?.trim();
  if (!raw) return {};
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0] };
  return { vorname: parts[0], nachname: parts.slice(1).join(" ") };
}

function parseStrasseHausnummer(line?: string | null): {
  strasse?: string;
  hausnummer?: string;
} {
  const raw = line?.trim();
  if (!raw) return {};
  const match = raw.match(/^(.+?)\s+(\d+\w*)$/);
  if (!match) return { strasse: raw };
  return { strasse: match[1].trim(), hausnummer: match[2] };
}

function telefonFromLead(lead?: PortalAnfrageLeadSource | null): string | undefined {
  if (!lead?.funnel_daten || typeof lead.funnel_daten !== "object") return undefined;
  const d = lead.funnel_daten as Record<string, unknown>;
  const tel = typeof d.telefon === "string" ? d.telefon.trim() : "";
  return tel || undefined;
}

/** Kontaktdaten für Katalog-Anfrage / Rechner aus Kundenstamm und letzter Anfrage. */
export function buildPortalContactPrefill(opts: {
  kunde: PortalKundeSource;
  leads?: PortalAnfrageLeadSource[];
  objekte?: PortalObjekt[];
}): PortalContactPrefill {
  const fromKunde = splitName(opts.kunde.name);
  const latestLead = opts.leads?.[0];
  const latestObjekt = latestLead?.objekt ?? opts.objekte?.[0] ?? null;

  const vorname = latestLead
    ? resolveAnfrageVorname(latestLead) ?? fromKunde.vorname
    : fromKunde.vorname;
  const nachname = latestLead
    ? resolveAnfrageNachname(latestLead) ?? fromKunde.nachname
    : fromKunde.nachname;

  const strasseLine =
    (latestLead && formatAnfrageStrasseHausnummer(latestLead)) ||
    latestObjekt?.strasse?.trim() ||
    opts.kunde.adresse?.trim() ||
    undefined;

  const parsedStrasse = parseStrasseHausnummer(strasseLine);
  const hausnummer =
    latestLead?.hausnummer?.trim() || parsedStrasse.hausnummer;

  const strasse =
    latestLead?.strasse?.trim() ||
    latestObjekt?.strasse?.trim() ||
    parsedStrasse.strasse;

  const { plz, ort } = objektPlzOrt(latestObjekt, latestLead?.plz ?? opts.kunde.plz);

  return {
    vorname,
    nachname,
    email: opts.kunde.email?.trim() || undefined,
    telefon: telefonFromLead(latestLead),
    plz: plz !== "—" ? plz : opts.kunde.plz?.trim() || undefined,
    ort: ort !== "—" ? ort : opts.kunde.ort?.trim() || undefined,
    strasse,
    hausnummer: hausnummer || undefined,
  };
}

const PF_KEYS = [
  ["pf_vorname", "vorname"],
  ["pf_nachname", "nachname"],
  ["pf_email", "email"],
  ["pf_telefon", "telefon"],
  ["pf_plz", "plz"],
  ["pf_ort", "ort"],
  ["pf_strasse", "strasse"],
  ["pf_hausnummer", "hausnummer"],
] as const;

export function appendPortalPrefillToUrl(
  href: string,
  prefill: PortalContactPrefill
): string {
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const q = new URLSearchParams(qIndex === -1 ? "" : href.slice(qIndex + 1));

  for (const [param, key] of PF_KEYS) {
    const val = prefill[key]?.trim();
    if (val) q.set(param, val);
  }

  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export function readPortalPrefillFromSearch(
  params: URLSearchParams
): PortalContactPrefill {
  const out: PortalContactPrefill = {};
  for (const [param, key] of PF_KEYS) {
    const val = params.get(param)?.trim();
    if (val) out[key] = val;
  }
  return out;
}
