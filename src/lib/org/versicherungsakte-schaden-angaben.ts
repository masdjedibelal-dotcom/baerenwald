/**
 * Strukturierte Schadenangaben für Versicherungs-PDF —
 * gleiche Logik wie Anfrage-/Eingang-Detail (Melder, Ort, Funnel-Fachdetails).
 */

import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { labelSituation } from "@/lib/lead-funnel-labels";
import { buildMeldeVorgangTitel } from "@/lib/org/melde-vorgang-titel";
import {
  formatAnfrageBereiche,
  formatAnfrageZeitraum,
  resolveAnfrageAdresse,
  resolveAnfrageMelder,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";

export type VersicherungsakteSchadenRow = { label: string; value: string };

export type VersicherungsakteSchadenLead = {
  situation?: string | null;
  bereiche?: string[] | null;
  zeitraum?: string | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  ort?: string | null;
  melder_name?: string | null;
  melder_einheit?: string | null;
  melder_telefon?: string | null;
  melder_email?: string | null;
  kontakt_name?: string | null;
  kontakt_nachricht?: string | null;
  notizen?: string | null;
  funnel_daten?: unknown;
  objekt?: PortalAnfrageLeadSource["objekt"];
};

function pushRow(
  rows: VersicherungsakteSchadenRow[],
  seen: Set<string>,
  label: string,
  value?: string | null
) {
  const v = (value ?? "").trim();
  if (!v || v === "—") return;
  const key = `${label.toLowerCase()}::${v.toLowerCase()}`;
  if (seen.has(key)) return;
  // Wert schon unter anderem Label? (z. B. Kurzbeschreibung = Beschreibung)
  for (const prev of rows) {
    if (prev.value.toLowerCase() === v.toLowerCase()) return;
  }
  seen.add(key);
  rows.push({ label, value: v });
}

/**
 * Alle relevanten Funnel-/Melde-Angaben als Tabellenzeilen
 * (Melder, Schadenort, Situation, Fachfragen, Freitext).
 */
export function buildVersicherungsakteSchadenAngaben(
  lead: VersicherungsakteSchadenLead
): VersicherungsakteSchadenRow[] {
  const source: PortalAnfrageLeadSource = {
    situation: lead.situation,
    bereiche: lead.bereiche,
    funnel_daten: lead.funnel_daten,
    zeitraum: lead.zeitraum,
    plz: lead.plz,
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    ort: lead.ort ?? null,
    melder_name: lead.melder_name,
    melder_einheit: lead.melder_einheit,
    melder_telefon: lead.melder_telefon,
    melder_email: lead.melder_email,
    kontakt_name: lead.kontakt_name,
    kontakt_nachricht: lead.kontakt_nachricht,
    objekt: lead.objekt ?? null,
  };

  const addr = resolveAnfrageAdresse(source);
  const melder = resolveAnfrageMelder(source);
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const situationSlug = norm.situation || lead.situation || undefined;
  const situationLabel =
    situationSlug && labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : null;

  const beschreibung =
    lead.kontakt_nachricht?.trim() || lead.notizen?.trim() || "";
  const kurz = buildMeldeVorgangTitel({
    situation: lead.situation,
    bereiche: lead.bereiche,
    funnelDaten: lead.funnel_daten,
    beschreibung,
  }).trim();

  const rows: VersicherungsakteSchadenRow[] = [];
  const seen = new Set<string>();

  if (kurz && kurz !== "Meldung" && !/^schadenmeldung\b/i.test(kurz)) {
    pushRow(rows, seen, "Kurzbeschreibung", kurz);
  }

  pushRow(rows, seen, "Melder", melder.name ?? lead.kontakt_name);
  pushRow(rows, seen, "Einheit", melder.einheit);
  pushRow(rows, seen, "Telefon", melder.telefon);
  pushRow(rows, seen, "E-Mail", melder.email);

  const plzOrt = [addr.plz, addr.ort].filter(Boolean).join(" ").trim();
  const schadenort = [addr.strasseZeile, plzOrt]
    .map((s) => (s ?? "").trim())
    .filter((s) => s && s !== "—")
    .join(", ");
  pushRow(
    rows,
    seen,
    "Schadenort",
    schadenort || (addr.listOrtLine !== "—" ? addr.listOrtLine : null)
  );

  pushRow(rows, seen, "Bereich", formatAnfrageBereiche(source));
  pushRow(rows, seen, "Situation", situationLabel);
  pushRow(rows, seen, "Dringlichkeit", formatAnfrageZeitraum(source));

  for (const r of fachdetailRowsFromFunnelDaten(
    lead.funnel_daten,
    lead.bereiche
  )) {
    pushRow(rows, seen, r.label, r.value);
  }

  if (
    beschreibung &&
    !/^am\s+/i.test(beschreibung) &&
    !/wurde der schaden gemeldet/i.test(beschreibung)
  ) {
    pushRow(rows, seen, "Beschreibung", beschreibung);
  }

  return rows;
}
