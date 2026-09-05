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
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { fmtPortalOrt } from "@/lib/shared/portal-detail-format";

export type PortalAnfrageLeadSource = {
  situation?: string | null;
  bereiche?: string[] | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  ort?: string | null;
  zeitraum?: string | null;
  preis_min?: number | null;
  preis_max?: number | null;
  budget_ca?: number | null;
  /** Melde-Mapping: Spanne unsicher / nach Prüfung */
  preis_unsicher?: boolean | null;
  kontakt_name?: string | null;
  kontakt_nachricht?: string | null;
  funnel_daten?: unknown;
  hv_meldung_status?: string | null;
  objekt?: PortalObjekt | null;
  /** HV-Meldung: Name des Melders */
  melder_name?: string | null;
  /** HV-Meldung: Einheit / WE */
  melder_einheit?: string | null;
  melder_telefon?: string | null;
  melder_email?: string | null;
  /** Zugangshinweis aus Kundenobjekt */
  einheiten_hinweis?: string | null;
  anlass?: string | null;
  erfassung_von?: string | null;
};

/**
 * Listen-Untertitel: „Lindenstr. 24 · 80331 München“
 * (nur Anschrift — ohne Melder, WE, Zeitraum.)
 */
export function formatMockVorgangListSubtitle(
  lead: PortalAnfrageLeadSource
): string | undefined {
  const line = formatAnfrageListOrtLine(lead);
  return line !== "—" ? line : undefined;
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function strField(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

/** CRM/HV speichert Adresse oft unter funnel_daten.mieter. */
export function funnelMieterRecord(
  funnelDaten: unknown
): Record<string, unknown> | null {
  const d = asRecord(funnelDaten);
  if (d.ohne_mieter === true) return null;
  const m = d.mieter;
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  return m as Record<string, unknown>;
}

export type ResolvedAnfrageAdresse = {
  strasse?: string;
  hausnummer?: string;
  /** „Lindenstr. 24“ */
  strasseZeile?: string;
  plz?: string;
  ort?: string;
  /** „Lindenstr. 24 · 80331 München“ */
  listOrtLine: string;
};

/**
 * Einheitliche Anschrift — Lead-Spalten, Funnel (inkl. mieter), Objekt.
 * Quelle CRM / HV / Mieter-Meldung → gleiche Portal-Struktur.
 */
export function resolveAnfrageAdresse(
  lead: PortalAnfrageLeadSource
): ResolvedAnfrageAdresse {
  const d = asRecord(lead.funnel_daten);
  const mieter = funnelMieterRecord(lead.funnel_daten);
  const obj = lead.objekt as
    | (PortalObjekt & {
        titel?: string;
        adresseZeile?: string;
        plzOrt?: string;
      })
    | null
    | undefined;

  const strasse =
    strField(lead.strasse) ||
    strField(d.strasse) ||
    strField(mieter?.strasse) ||
    undefined;
  const hausnummer =
    strField(lead.hausnummer) ||
    strField(d.hausnummer) ||
    strField(mieter?.hausnummer) ||
    undefined;

  let strasseZeile =
    [strasse, hausnummer].filter(Boolean).join(" ").trim() || undefined;
  if (!strasseZeile) {
    const objStrasse = strField(obj?.strasse);
    const objHausnummer =
      "hausnummer" in (obj ?? {})
        ? strField((obj as { hausnummer?: string | null }).hausnummer)
        : undefined;
    strasseZeile =
      [objStrasse, objHausnummer].filter(Boolean).join(" ").trim() ||
      strField(obj?.adresseZeile) ||
      undefined;
  }

  const plzOrtFromObj = strField(obj?.plzOrt);
  const plzOrtMatch = plzOrtFromObj?.match(/^(\d{4,5})\s+(.*)$/);

  const plz =
    strField(lead.plz) ||
    strField(d.plz) ||
    strField(mieter?.plz) ||
    strField(obj?.plz) ||
    plzOrtMatch?.[1] ||
    undefined;

  const ort =
    strField(lead.ort) ||
    strField(d.ort) ||
    strField(mieter?.ort) ||
    strField(obj?.ort) ||
    plzOrtMatch?.[2]?.trim() ||
    undefined;

  const plzOrt = fmtPortalOrt(plz ?? "—", ort ?? "—");
  const parts = [
    strasseZeile,
    plzOrt !== "—" ? plzOrt : undefined,
  ].filter(Boolean);
  return {
    strasse,
    hausnummer,
    strasseZeile,
    plz,
    ort,
    listOrtLine: parts.join(" · ") || "—",
  };
}

export type ResolvedAnfrageMelder = {
  name?: string;
  vorname?: string;
  nachname?: string;
  telefon?: string;
  email?: string;
  einheit?: string;
};

/**
 * Melder/Mieter-Kontakt — Lead-Spalten oder funnel_daten.mieter (wenn gewählt).
 */
export function resolveAnfrageMelder(
  lead: PortalAnfrageLeadSource
): ResolvedAnfrageMelder {
  const d = asRecord(lead.funnel_daten);
  if (d.ohne_mieter === true) {
    return {};
  }
  const mieter = funnelMieterRecord(lead.funnel_daten);
  const mieterName =
    strField(mieter?.name) ||
    [strField(mieter?.vorname), strField(mieter?.nachname)]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    undefined;

  const name =
    strField(lead.melder_name) ||
    mieterName ||
    undefined;

  const vorname =
    strField(mieter?.vorname) ||
    strField(d.vorname) ||
    splitKontaktName(name ?? lead.kontakt_name).vorname;

  const nachname =
    strField(mieter?.nachname) ||
    strField(d.nachname) ||
    splitKontaktName(name ?? lead.kontakt_name).nachname;

  return {
    name,
    vorname,
    nachname,
    telefon:
      strField(lead.melder_telefon) ||
      strField(mieter?.telefon) ||
      undefined,
    email:
      strField(lead.melder_email) ||
      strField(mieter?.email) ||
      undefined,
    einheit:
      strField(lead.melder_einheit) ||
      strField(mieter?.einheit) ||
      undefined,
  };
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
  return resolveAnfrageMelder(lead).vorname;
}

export function resolveAnfrageNachname(lead: PortalAnfrageLeadSource): string | undefined {
  return resolveAnfrageMelder(lead).nachname;
}

export function formatAnfrageStrasseHausnummer(
  lead: PortalAnfrageLeadSource
): string | undefined {
  return resolveAnfrageAdresse(lead).strasseZeile;
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
  return resolveAnfrageAdresse(lead).listOrtLine;
}

export function buildAnfrageCardMeta(
  lead: PortalAnfrageLeadSource
): PortalListCardMeta[] {
  const meta: PortalListCardMeta[] = [];
  const was = formatAnfrageWasGemacht(lead);
  if (was) meta.push({ icon: "hammer", text: was });
  const ortLine = formatAnfrageListOrtLine(lead);
  if (ortLine !== "—") meta.push({ icon: "map-pin", text: ortLine });
  const zeitraum = formatAnfrageZeitraum(lead);
  if (zeitraum) meta.push({ icon: "calendar", text: zeitraum });
  return meta;
}

export function buildAnfragePersonalSection(
  lead: PortalAnfrageLeadSource
): PortalDetailSection | null {
  const addr = resolveAnfrageAdresse(lead);
  const melder = resolveAnfrageMelder(lead);
  const personalRows = detailRows([
    { label: "Vorname", value: melder.vorname },
    { label: "Nachname", value: melder.nachname },
    { label: "Straße Hausnummer", value: addr.strasseZeile },
    { label: "PLZ", value: addr.plz },
    { label: "Ort", value: addr.ort },
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
