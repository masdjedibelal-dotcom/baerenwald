import { FACHDETAIL_QUESTIONS } from "@/lib/funnel/fachdetail-questions-flat";
import { lineLeistungsLabel } from "@/lib/funnel/breakdown-labels";
import type {
  FachdetailsState,
  FunnelState,
  PriceLineItem,
} from "@/lib/funnel/types";
import {
  FACHDETAIL_TO_LEISTUNG,
  labelBadAusstattung,
  labelBereich,
  labelDringlichkeit,
  labelKundentyp,
  labelSituation,
  labelZeitraum,
  labelZugaenglichkeit,
} from "@/lib/lead-funnel-labels";

export type NormalizedFunnelDaten = {
  situation: string | null;
  bereiche: string[];
  fachdetails: FachdetailsState;
  breakdown: PriceLineItem[];
  zeitraum: string | null;
  dringlichkeit: string | null;
  kundentyp: string | null;
  zugaenglichkeit: string | null;
  groesse: number | null;
  groesseEinheit: FunnelState["groesseEinheit"];
  badAusstattung: FunnelState["badAusstattung"];
  freitext: string | null;
  leadBeschreibung: string | null;
};

const ANSWER_LABEL_INDEX: Record<string, Record<string, string>> = {};
for (const q of FACHDETAIL_QUESTIONS) {
  const m: Record<string, string> = {};
  for (const o of q.optionen) {
    m[o.value] = o.label;
  }
  ANSWER_LABEL_INDEX[q.id] = m;
}

function answerLabel(questionId: string, value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    const idx = ANSWER_LABEL_INDEX[questionId];
    return value
      .map((v) => idx?.[String(v)] ?? String(v))
      .filter(Boolean)
      .join(", ");
  }
  const s = String(value).trim();
  return ANSWER_LABEL_INDEX[questionId]?.[s] ?? s.replace(/_/g, " ");
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

export function normalizeFunnelDaten(
  funnel_daten: unknown,
  bereicheFallback?: string[] | null
): NormalizedFunnelDaten {
  const d = asRecord(funnel_daten);
  const bereiche = Array.isArray(d.bereiche)
    ? (d.bereiche as string[]).map(String)
    : Array.isArray(bereicheFallback)
      ? bereicheFallback
      : [];

  const fdRaw = d.fachdetails;
  const fachdetails: FachdetailsState =
    fdRaw && typeof fdRaw === "object" && !Array.isArray(fdRaw)
      ? { ...(fdRaw as FachdetailsState) }
      : {};

  /** Melde-API legt Antworten top-level ab (`funnel_daten.fachdetailAnswers`). */
  const topAnswers = d.fachdetailAnswers;
  if (topAnswers && typeof topAnswers === "object" && !Array.isArray(topAnswers)) {
    fachdetails.fachdetailAnswers = {
      ...(fachdetails.fachdetailAnswers ?? {}),
      ...(topAnswers as Record<string, string | string[] | undefined>),
    };
  }

  const breakdown = Array.isArray(d.breakdown)
    ? (d.breakdown as PriceLineItem[])
    : [];

  return {
    situation:
      typeof d.situation === "string" ? d.situation : null,
    bereiche,
    fachdetails,
    breakdown,
    zeitraum: typeof d.zeitraum === "string" ? d.zeitraum : null,
    dringlichkeit:
      typeof d.dringlichkeit === "string" ? d.dringlichkeit : null,
    kundentyp: typeof d.kundentyp === "string" ? d.kundentyp : null,
    zugaenglichkeit:
      typeof d.zugaenglichkeit === "string" ? d.zugaenglichkeit : null,
    groesse: typeof d.groesse === "number" ? d.groesse : null,
    groesseEinheit:
      d.groesseEinheit === "qm" ||
      d.groesseEinheit === "stueck" ||
      d.groesseEinheit === "meter"
        ? d.groesseEinheit
        : null,
    badAusstattung:
      d.badAusstattung === "standard" ||
      d.badAusstattung === "komfort" ||
      d.badAusstattung === "gehoben"
        ? d.badAusstattung
        : null,
    freitext:
      typeof d.freitext === "string" && d.freitext.trim()
        ? d.freitext.trim()
        : null,
    leadBeschreibung:
      typeof d.leadBeschreibung === "string" && d.leadBeschreibung.trim()
        ? d.leadBeschreibung.trim()
        : null,
  };
}

const AUTO_FREITEXT_MARKERS: RegExp[] = [
  /^=== /m,
  /^Bereiche:/m,
  /^PLZ:/m,
  /Strukturierte Fachdetails/i,
  /Antworten \(IDs\):/,
  /^Situation:/m,
  /^Zeitraum:/m,
  /^Projektanfrage/m,
  /^Reparatur\/Notfall/m,
  /^Betreuungsanfrage/m,
  /^Gewerbliche Anfrage/m,
  /^Kundentyp:/m,
  /^Dringlichkeit:/m,
  /^Ziel-System \(Heizung\):/,
  /^⚠️ ACHTUNG:/,
  /^Garten:/m,
];

/** Nur echter Kundentext — keine Auto-Zusammenfassung aus dem Rechner. */
export function isEchterFreitext(text: string | undefined | null): boolean {
  const t = (text ?? "").trim();
  if (!t || t.length < 3) return false;
  if (AUTO_FREITEXT_MARKERS.some((re) => re.test(t))) return false;
  const lines = t.split("\n").filter((l) => l.trim());
  const kvLines = lines.filter((l) =>
    /^[A-Za-zÄÖÜäöüß][^:]{0,48}:\s/.test(l.trim())
  );
  if (lines.length >= 4 && kvLines.length / lines.length > 0.55) {
    return false;
  }
  return true;
}

export function extractKundenFreitext(
  norm: NormalizedFunnelDaten,
  nachricht?: string | null
): string | null {
  for (const c of [norm.freitext, norm.leadBeschreibung, nachricht]) {
    const t = (c ?? "").trim();
    if (t && isEchterFreitext(t)) return t;
  }
  return null;
}

function gewerkeForBereich(bereich: string): string[] {
  const g = FACHDETAIL_TO_LEISTUNG[bereich];
  return g ? [g] : [];
}

function fachdetailLinesForBereich(
  bereich: string,
  norm: NormalizedFunnelDaten
): string[] {
  const gewerke = new Set(gewerkeForBereich(bereich));
  const lines: string[] = [];
  const ans = norm.fachdetails.fachdetailAnswers ?? {};

  for (const q of FACHDETAIL_QUESTIONS) {
    if (!gewerke.has(q.gewerk)) continue;
    const v = ans[q.id];
    if (v === undefined || v === null || v === "") continue;
    const label = answerLabel(q.id, v);
    if (label) lines.push(label);
  }

  const fd = norm.fachdetails;
  if (bereich === "bad" || bereich === "sanitaer" || bereich === "wasser") {
    const bw = fd.sanitaer?.badWas;
    if (bw) lines.push(answerLabel("bad_was", bw));
  }
  if (
    (bereich === "waende" || bereich === "maler" || bereich === "streichen") &&
    fd.maler?.was
  ) {
    lines.push(answerLabel("maler_was", fd.maler.was));
  }
  if (bereich === "bad" && norm.badAusstattung) {
    const a = labelBadAusstattung(norm.badAusstattung);
    if (a) lines.push(a);
  }

  return Array.from(new Set(lines));
}

export type MailTableRow = { label: string; value: string };

export function buildLeistungenRows(
  norm: NormalizedFunnelDaten
): MailTableRow[] {
  const rows: MailTableRow[] = [];
  for (const b of norm.bereiche) {
    const parts = fachdetailLinesForBereich(b, norm);
    if (parts.length === 0) continue;
    rows.push({
      label: labelBereich(b),
      value: parts.join(" · "),
    });
  }
  return rows;
}

/**
 * Einzelne Fachfragen → Antwort (Frage als Label) — für HV-/Portal-Details.
 */
export function buildFachdetailAnswerRows(
  norm: NormalizedFunnelDaten
): MailTableRow[] {
  const ans = norm.fachdetails.fachdetailAnswers ?? {};
  const rows: MailTableRow[] = [];
  const seen = new Set<string>();

  for (const q of FACHDETAIL_QUESTIONS) {
    const v = ans[q.id];
    if (v === undefined || v === null || v === "") continue;
    const value = answerLabel(q.id, v);
    if (!value) continue;
    rows.push({ label: q.frage, value });
    seen.add(q.id);
  }

  for (const [id, v] of Object.entries(ans)) {
    if (seen.has(id)) continue;
    if (v === undefined || v === null || v === "") continue;
    const value = answerLabel(id, v);
    if (!value) continue;
    rows.push({
      label: id.replace(/_/g, " "),
      value,
    });
  }

  return rows;
}

/** Convenience: direkt aus Lead-`funnel_daten`. */
export function fachdetailRowsFromFunnelDaten(
  funnel_daten: unknown,
  bereicheFallback?: string[] | null
): MailTableRow[] {
  return buildFachdetailAnswerRows(
    normalizeFunnelDaten(funnel_daten, bereicheFallback)
  );
}

export function buildBreakdownRows(
  norm: NormalizedFunnelDaten
): MailTableRow[] {
  return norm.breakdown
    .filter((item) => item.min > 0 || item.max > 0 || item.beschreibung)
    .map((item) => ({
      label: item.gewerk.trim() || "Leistung",
      value: lineLeistungsLabel(item),
    }));
}

export function buildGroessenRows(
  norm: NormalizedFunnelDaten
): MailTableRow[] {
  if (norm.groesse == null) return [];
  const u = norm.groesseEinheit;
  let formatted: string;
  if (u === "qm") formatted = `${norm.groesse} m²`;
  else if (u === "stueck") formatted = `${norm.groesse} Stück`;
  else if (u === "meter") formatted = `${norm.groesse} m`;
  else formatted = String(norm.groesse);

  const b = new Set(norm.bereiche);
  let label = "Fläche";
  if (b.has("bad")) label = "Bad";
  else if (b.has("waende") || b.has("maler") || b.has("streichen")) {
    label = "Wandfläche";
  } else if (b.has("boden")) label = "Bodenfläche";
  else if (b.has("dach")) label = "Dachfläche";
  else if (b.has("fassade")) label = "Fassadenfläche";
  else if (b.has("garten") || b.has("gartengestaltung")) label = "Gartenfläche";

  return [{ label, value: formatted }];
}

export function effectivePreisRange(
  preis_min: number | undefined | null,
  preis_max: number | undefined | null,
  norm: NormalizedFunnelDaten
): { min: number; max: number } {
  const breakdown = norm.breakdown ?? [];
  const preisAusBreakdown = breakdown.reduce(
    (acc, b) => ({
      min: acc.min + (b.min ?? 0),
      max: acc.max + (b.max ?? 0),
    }),
    { min: 0, max: 0 }
  );
  const min =
    (preis_min ?? 0) > 0 ? (preis_min as number) : preisAusBreakdown.min;
  const max =
    (preis_max ?? 0) > 0 ? (preis_max as number) : preisAusBreakdown.max;
  return { min, max };
}

export function formatPreisrahmenDe(min: number, max: number): string {
  if (min > 0 && max > 0) {
    return `${min.toLocaleString("de-DE")} – ${max.toLocaleString("de-DE")} €`;
  }
  return "";
}

export function buildInternNotificationSubject(input: {
  name: string;
  bereiche?: string[];
  plz?: string;
}): string {
  const bereiche_labels =
    input.bereiche
      ?.map((b) => labelBereich(b))
      .join(" · ") ?? "";
  const plz = input.plz?.trim();
  let subject = `Neue Anfrage: ${input.name.trim() || "—"}`;
  if (bereiche_labels) subject += ` — ${bereiche_labels}`;
  if (plz) subject += ` · ${plz}`;
  return subject;
}

export {
  labelSituation,
  labelKundentyp,
  labelZeitraum,
  labelDringlichkeit,
  labelZugaenglichkeit,
  labelBereich,
};
