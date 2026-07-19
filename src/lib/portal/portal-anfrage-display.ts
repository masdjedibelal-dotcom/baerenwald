import { Calendar, Hammer, MapPin } from "lucide-react";

import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import {
  buildGroessenRows,
  buildLeistungenRows,
  extractKundenFreitext,
  labelBereich,
  labelDringlichkeit,
  labelSituation,
  labelZeitraum,
  normalizeFunnelDaten,
  type NormalizedFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { labelBadAusstattung } from "@/lib/lead-funnel-labels";
import { lineLeistungsLabel } from "@/lib/funnel/breakdown-labels";
import { isB2B, type Situation } from "@/lib/funnel/types";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import { sanitizeCustomerText, stripHtmlToPlainText } from "@/lib/portal/portal-display";
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
  hv_meldung_status?: string | null;
  objekt?: PortalObjekt | null;
  /** HV-Meldung: Name des Melders */
  melder_name?: string | null;
  /** HV-Meldung: Einheit / WE */
  melder_einheit?: string | null;
  anlass?: string | null;
  erfassung_von?: string | null;
};

/**
 * Mock-Vorgangsliste: „Lindenstr. 24 · WE 1 · H. Berger (Eigentümer)“
 */
export function formatMockVorgangListSubtitle(
  lead: PortalAnfrageLeadSource
): string | undefined {
  const adresse = formatAnfrageStrasseHausnummer(lead);
  const weRaw = lead.melder_einheit?.trim();
  const we = weRaw
    ? /^(WE|Whg\.?|Einheit)\b/i.test(weRaw)
      ? weRaw
      : `WE ${weRaw}`
    : undefined;
  const name = lead.melder_name?.trim() || lead.kontakt_name?.trim();
  let person: string | undefined;
  if (name) {
    const rawRole =
      lead.anlass?.trim() ||
      lead.erfassung_von?.trim() ||
      (typeof asRecord(lead.funnel_daten).rolle === "string"
        ? String(asRecord(lead.funnel_daten).rolle)
        : "");
    const role = /mieter/i.test(rawRole)
      ? "Mieter"
      : /eigent/i.test(rawRole)
        ? "Eigentümer"
        : lead.melder_name || lead.hv_meldung_status
          ? "Eigentümer"
          : undefined;
    person = role && !/\(/.test(name) ? `${name} (${role})` : name;
  }
  const parts = [adresse, we, person].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

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
  if (norm.breakdown.length > 0) {
    const parts = norm.breakdown
      .map((item) => lineLeistungsLabel(item))
      .filter((p) => p && p !== "—");
    if (parts.length) return parts.join(" · ");
  }
  if (norm.badAusstattung) {
    const ausstattung = labelBadAusstattung(norm.badAusstattung);
    if (ausstattung) return ausstattung;
  }
  return undefined;
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

export type AnfrageProjektSectionOpts = {
  /** Leistungsumfang aus CRM-Angebot (wizard_meta in Notizen). */
  crm_leistungsumfang?: string | null;
  /** Partner: nur Situation + Bereich (kein Gesamtprojekt bei Teilleistungen). */
  kompakt?: boolean;
};

function buildKompakteProjektRows(
  situation?: string,
  bereich?: string
): Array<{ label: string; value: string }> {
  return dedupeProjektRows(
    detailRows([
      { label: "Situation", value: situation },
      {
        label: "Bereich",
        value:
          bereich && !projektTextsEquivalent(bereich, situation) ? bereich : undefined,
      },
    ])
  );
}

function normalizeProjektCompareText(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[·,;|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projektTextsEquivalent(a?: string | null, b?: string | null): boolean {
  const na = normalizeProjektCompareText(a);
  const nb = normalizeProjektCompareText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

function dedupeProjektRows(
  rows: Array<{ label: string; value: string }>
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  for (const row of rows) {
    if (out.some((prev) => projektTextsEquivalent(prev.value, row.value))) continue;
    out.push(row);
  }
  return out;
}

function hasStructuredFunnelDetails(norm: NormalizedFunnelDaten): boolean {
  if (buildLeistungenRows(norm).length > 0) return true;
  const answers = norm.fachdetails.fachdetailAnswers ?? {};
  if (Object.keys(answers).length > 0) return true;
  if (norm.breakdown.length > 0) return true;
  if (norm.groesse != null) return true;
  if (norm.zugaenglichkeit) return true;
  if (norm.kundentyp) return true;
  return false;
}

function resolveCrmProjektbeschreibung(
  lead: PortalAnfrageLeadSource,
  norm: NormalizedFunnelDaten,
  opts?: AnfrageProjektSectionOpts
): string | undefined {
  const candidates = [
    sanitizeCustomerText(opts?.crm_leistungsumfang, 4000),
    extractKundenFreitext(norm, lead.kontakt_nachricht),
    sanitizeCustomerText(lead.kontakt_nachricht, 4000),
    formatAnfrageWasGemacht(lead),
  ];
  for (const c of candidates) {
    const plain = stripHtmlToPlainText(c ?? undefined) || c || undefined;
    if (detailValue(plain)) return plain;
  }
  return undefined;
}

export function buildAnfrageProjektSection(
  lead: PortalAnfrageLeadSource,
  opts?: AnfrageProjektSectionOpts
): PortalDetailSection | null {
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const situationSlug = norm.situation || lead.situation || undefined;
  const situation =
    labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : undefined;
  const bereich = formatAnfrageBereiche(lead);
  const groesse = formatAnfrageGroesse(lead);
  const zeitraum = formatAnfrageZeitraum(lead);
  const gewerbe = isB2B(situationSlug as Situation | undefined);
  const structured = hasStructuredFunnelDetails(norm);
  const kompakt = opts?.kompakt === true;

  if (kompakt) {
    const projektRows = buildKompakteProjektRows(situation, bereich);
    if (!projektRows.length) return null;
    return { heading: "Projektübersicht", rows: projektRows };
  }

  if (gewerbe) {
    const projektRows = dedupeProjektRows(
      detailRows([{ label: "Situation", value: situation }])
    );
    if (!projektRows.length) return null;
    return { heading: "Projektübersicht", rows: projektRows };
  }

  if (structured) {
    const was = formatAnfrageWasGemacht(lead);
    const projektRows = dedupeProjektRows(
      detailRows([
        { label: "Situation", value: situation },
        { label: "Bereich", value: bereich },
        { label: "Fläche Menge Anzahl", value: groesse },
        { label: "Was soll gemacht werden", value: was },
        { label: "Zeitraum", value: zeitraum },
      ])
    );
    if (!projektRows.length) return null;
    return { heading: "Projektübersicht", rows: projektRows };
  }

  /** CRM / manuell: keine Fachdetails — kompakte Übersicht ohne Wiederholungen. */
  const beschreibung = resolveCrmProjektbeschreibung(lead, norm, opts);
  const projektRows = dedupeProjektRows(
    detailRows([
      { label: "Situation", value: situation },
      {
        label: "Bereich",
        value:
          bereich &&
          !projektTextsEquivalent(bereich, situation) &&
          !projektTextsEquivalent(bereich, beschreibung)
            ? bereich
            : undefined,
      },
      { label: "Projektbeschreibung", value: beschreibung },
      { label: "Fläche Menge Anzahl", value: groesse },
      { label: "Zeitraum", value: zeitraum },
    ])
  );

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
