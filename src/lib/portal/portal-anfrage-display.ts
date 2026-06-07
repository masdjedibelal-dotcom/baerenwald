import { Calendar, Hammer, MapPin } from "lucide-react";

import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import {
  buildGroessenRows,
  buildLeistungenRows,
  effectivePreisRange,
  extractKundenFreitext,
  formatPreisrahmenDe,
  labelBereich,
  labelDringlichkeit,
  labelSituation,
  labelZeitraum,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import { objektPlzOrt } from "@/lib/portal/portal-detail-item";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { fmtPortalOrt } from "@/lib/shared/portal-detail-format";

export type PortalAnfrageLeadSource = {
  situation?: string | null;
  bereiche?: string[] | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  zeitraum?: string | null;
  preis_min?: number | null;
  preis_max?: number | null;
  budget_ca?: number | null;
  kontakt_name?: string | null;
  kontakt_nachricht?: string | null;
  funnel_daten?: unknown;
  objekt?: PortalObjekt | null;
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function detailValue(v?: string | null): string | undefined {
  const t = v?.trim();
  return t && t !== "—" ? t : undefined;
}

function detailRows(
  rows: Array<{ label: string; value?: string | null }>
): Array<{ label: string; value: string }> {
  return rows
    .map((r) => ({ label: r.label, value: detailValue(r.value) }))
    .filter((r): r is { label: string; value: string } => Boolean(r.value));
}

function splitKontaktName(name?: string | null): {
  vorname?: string;
  nachname?: string;
} {
  const raw = name?.trim();
  if (!raw) return {};
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0] };
  return {
    vorname: parts[0],
    nachname: parts.slice(1).join(" "),
  };
}

export function resolveAnfrageVorname(lead: PortalAnfrageLeadSource): string | undefined {
  const d = asRecord(lead.funnel_daten);
  const fromFunnel =
    typeof d.vorname === "string" ? d.vorname.trim() : "";
  if (fromFunnel) return fromFunnel;
  return splitKontaktName(lead.kontakt_name).vorname;
}

export function resolveAnfrageNachname(lead: PortalAnfrageLeadSource): string | undefined {
  const d = asRecord(lead.funnel_daten);
  const fromFunnel =
    typeof d.nachname === "string" ? d.nachname.trim() : "";
  if (fromFunnel) return fromFunnel;
  return splitKontaktName(lead.kontakt_name).nachname;
}

export function formatAnfrageStrasseHausnummer(
  lead: PortalAnfrageLeadSource
): string | undefined {
  const d = asRecord(lead.funnel_daten);
  const strasse =
    lead.strasse?.trim() ||
    (typeof d.strasse === "string" ? d.strasse.trim() : "") ||
    undefined;
  const hausnummer =
    lead.hausnummer?.trim() ||
    (typeof d.hausnummer === "string" ? d.hausnummer.trim() : "") ||
    undefined;
  if (strasse || hausnummer) {
    return [strasse, hausnummer].filter(Boolean).join(" ");
  }
  const fromObjekt = lead.objekt?.strasse?.trim();
  return fromObjekt || undefined;
}

export function formatAnfrageBereiche(lead: PortalAnfrageLeadSource): string | undefined {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const parts = norm.bereiche
    .map((b) => labelBereich(b))
    .filter((l) => l && l !== "—");
  return parts.length ? parts.join(", ") : undefined;
}

export function formatAnfrageWasGemacht(
  lead: PortalAnfrageLeadSource
): string | undefined {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const rows = buildLeistungenRows(norm);
  if (rows.length) {
    return rows.map((r) => r.value).join(" · ");
  }
  const freitext = extractKundenFreitext(norm, lead.kontakt_nachricht);
  if (freitext) return freitext;
  const bereiche = formatAnfrageBereiche(lead);
  return bereiche;
}

export function formatAnfrageZeitraum(lead: PortalAnfrageLeadSource): string | undefined {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const slug = lead.zeitraum?.trim() || norm.zeitraum || norm.dringlichkeit;
  const label =
    labelZeitraum(slug) ||
    labelDringlichkeit(slug) ||
    slug?.replace(/_/g, " ");
  return detailValue(label);
}

export function formatAnfrageGroesse(lead: PortalAnfrageLeadSource): string | undefined {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const rows = buildGroessenRows(norm);
  if (!rows.length) return undefined;
  return rows.map((r) => r.value).join(" · ");
}

export function formatAnfragePreisrahmen(lead: PortalAnfrageLeadSource): string | undefined {
  if (typeof lead.budget_ca === "number" && lead.budget_ca > 0) {
    return `${lead.budget_ca.toLocaleString("de-DE")} €`;
  }
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const { min, max } = effectivePreisRange(lead.preis_min, lead.preis_max, norm);
  const formatted = formatPreisrahmenDe(min, max);
  return detailValue(formatted);
}

export function formatAnfrageListOrtLine(lead: PortalAnfrageLeadSource): string {
  const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
  const strasse = formatAnfrageStrasseHausnummer(lead);
  const plzOrt = fmtPortalOrt(plz, ort);
  const parts = [strasse, plzOrt !== "—" ? plzOrt : undefined].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function buildAnfrageCardMeta(
  lead: PortalAnfrageLeadSource
): PortalListCardMeta[] {
  const meta: PortalListCardMeta[] = [];
  const was = formatAnfrageWasGemacht(lead);
  if (was) meta.push({ icon: Hammer, text: was });
  const ortLine = formatAnfrageListOrtLine(lead);
  if (ortLine !== "—") meta.push({ icon: MapPin, text: ortLine });
  const zeitraum = formatAnfrageZeitraum(lead);
  if (zeitraum) meta.push({ icon: Calendar, text: zeitraum });
  return meta;
}

export function buildAnfragePersonalSection(
  lead: PortalAnfrageLeadSource
): PortalDetailSection | null {
  const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
  const personalRows = detailRows([
    { label: "Vorname", value: resolveAnfrageVorname(lead) },
    { label: "Nachname", value: resolveAnfrageNachname(lead) },
    { label: "Straße Hausnummer", value: formatAnfrageStrasseHausnummer(lead) },
    { label: "PLZ", value: plz !== "—" ? plz : undefined },
    { label: "Ort", value: ort !== "—" ? ort : undefined },
  ]);
  if (!personalRows.length) return null;
  return { heading: "Persönliche Angaben", rows: personalRows };
}

export function buildAnfrageProjektSection(
  lead: PortalAnfrageLeadSource
): PortalDetailSection | null {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const situation =
    labelSituation(norm.situation || lead.situation) !== "—"
      ? labelSituation(norm.situation || lead.situation)
      : undefined;

  const projektRows = detailRows([
    { label: "Situation", value: situation },
    { label: "Bereich", value: formatAnfrageBereiche(lead) },
    { label: "Fläche Menge Anzahl", value: formatAnfrageGroesse(lead) },
    { label: "Was soll gemacht werden", value: formatAnfrageWasGemacht(lead) },
    { label: "Zeitraum", value: formatAnfrageZeitraum(lead) },
    { label: "Preisrahmen", value: formatAnfragePreisrahmen(lead) },
  ]);

  if (!projektRows.length) return null;
  return { heading: "Projektübersicht", rows: projektRows };
}

export function buildAnfragePortalSections(
  lead: PortalAnfrageLeadSource
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];
  const personal = buildAnfragePersonalSection(lead);
  if (personal) sections.push(personal);
  const projekt = buildAnfrageProjektSection(lead);
  if (projekt) sections.push(projekt);
  return sections;
}
