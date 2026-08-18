/**
 * Angebots-JSON → `auftrag_positionen` (Portal-Annahme, CRM-Parität zu createAuftragFromAngebot).
 */

const SKIP_SLUGS = new Set(["__freitext__", "__gesamtrabatt__"]);
const GEWERK_BESCHREIBUNG_TITEL = "__gewerk_beschreibung__";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function isGewerkBeschreibung(row: Record<string, unknown>): boolean {
  const slug = String(row.gewerk_slug ?? "").trim().toLowerCase();
  if (SKIP_SLUGS.has(slug)) return true;
  const titel = String(row.leistung_name ?? row.leistung ?? "").trim();
  return titel === GEWERK_BESCHREIBUNG_TITEL;
}

function zeilenNetto(row: Record<string, unknown>): number {
  const menge = Math.max(num(row.menge) || 1, 0.0001);
  const vk = num(row.vk_netto);
  if (vk > 0) return Math.round(vk * menge * 100) / 100;
  const lohn = num(row.lohn_netto);
  const mat = num(row.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return Math.round(fromParts * 100) / 100;
  const gesamt = num(row.gesamt_min);
  if (gesamt > 0) return Math.round(gesamt * 100) / 100;
  return 0;
}

export type AuftragPositionInsertRow = {
  auftrag_id: string;
  gewerk_slug: string | null;
  gewerk_name: string;
  gewerk_block_key: string | null;
  projekt_phase: string;
  oberkategorie: null;
  unterkategorie: null;
  leistung_name: string;
  beschreibung: string | null;
  einheit: string;
  menge: number;
  preis_fix: number | null;
  lohn_fix: number | null;
  material_fix: number | null;
  handwerker_id: string | null;
  sort_order: number;
  typ: string;
  verguetung: string;
};

export function angebotPositionenJsonToAuftragRows(
  auftragId: string,
  positionen: unknown
): AuftragPositionInsertRow[] {
  if (!Array.isArray(positionen)) return [];
  const out: AuftragPositionInsertRow[] = [];
  let sort = 0;
  for (const item of positionen) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    if (isGewerkBeschreibung(p)) continue;

    const menge = Math.max(num(p.menge) || 1, 0.01);
    const preis = zeilenNetto(p);
    const isRegie = String(p.verguetung ?? "").toLowerCase() === "aufwand";
    const leistung_name = String(
      p.leistung_name ?? p.leistung ?? p.beschreibung ?? "Leistung"
    )
      .trim()
      .slice(0, 500);
    if (!leistung_name) continue;

    const beschreibung = [p.beschreibung, p.notiz_extern]
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);

    const slug = String(p.gewerk_slug ?? "").trim() || null;
    const gName = String(p.gewerk_name ?? "Gewerk").trim().slice(0, 500);
    const gId = String(p.gewerk_id ?? "").trim();
    const lohnZeile = Math.round(num(p.lohn_netto) * menge * 100) / 100;
    const matZeile = Math.round(num(p.material_netto) * menge * 100) / 100;

    out.push({
      auftrag_id: auftragId,
      gewerk_slug: slug,
      gewerk_name: gName || "Gewerk",
      gewerk_block_key:
        String(p.gewerk_block_key ?? "").trim() || gId || slug || null,
      projekt_phase: "Ausführung",
      oberkategorie: null,
      unterkategorie: null,
      leistung_name,
      beschreibung: beschreibung || null,
      einheit: String(p.einheit ?? (isRegie ? "h" : "pauschal")).trim().slice(0, 80),
      menge,
      preis_fix: preis > 0 ? preis : null,
      lohn_fix: lohnZeile > 0 ? lohnZeile : null,
      material_fix: matZeile > 0 ? matZeile : null,
      handwerker_id: String(p.handwerker_id ?? "").trim() || null,
      sort_order: sort,
      typ: isRegie ? "regie" : "lv",
      verguetung: isRegie ? "aufwand" : "festpreis",
    });
    sort += 10;
  }
  return out;
}
