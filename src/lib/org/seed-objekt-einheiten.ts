import { parseEinheitenCount } from "@/lib/portal2/objekte";
import { supabaseAdmin } from "@/lib/supabase";

/** Max. Auto-Anlage (Schutz vor Fehl-Eingaben). */
const MAX_SEED_EINHEITEN = 200;

export function defaultEinheitBezeichnung(n: number): string {
  return `WE ${Math.max(1, Math.floor(n))}`;
}

/**
 * Legt fehlende Standardeinheiten an, bis `count` aktive Einheiten existieren.
 * Bezeichnungen: WE 1, WE 2, … (überspringt bereits vergebene Labels).
 */
export async function ensureDefaultObjektEinheiten(
  objektId: string,
  count: number
): Promise<number> {
  const id = objektId.trim();
  const target = Math.min(
    MAX_SEED_EINHEITEN,
    Math.max(0, Math.floor(Number(count) || 0))
  );
  if (!id || target < 1) return 0;

  const { data: existing, error } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, bezeichnung, aktiv, sort_order")
    .eq("kunde_objekt_id", id);

  if (error) return 0;

  const all = existing ?? [];
  const active = all.filter((e) => e.aktiv !== false);
  if (active.length >= target) return 0;

  const labels = new Set(
    all.map((e) => String(e.bezeichnung ?? "").trim().toLowerCase())
  );
  const maxSort = active.reduce(
    (m, e) => Math.max(m, Number(e.sort_order) || 0),
    0
  );

  const rows: Array<{
    kunde_objekt_id: string;
    bezeichnung: string;
    sort_order: number;
    aktiv: boolean;
  }> = [];

  let n = 1;
  while (rows.length < target - active.length && n <= target + 500) {
    const bezeichnung = defaultEinheitBezeichnung(n);
    const key = bezeichnung.toLowerCase();
    if (!labels.has(key)) {
      rows.push({
        kunde_objekt_id: id,
        bezeichnung,
        sort_order: maxSort + rows.length + 1,
        aktiv: true,
      });
      labels.add(key);
    }
    n += 1;
  }

  if (!rows.length) return 0;

  const { error: insertErr } = await supabaseAdmin
    .from("objekt_einheiten")
    .insert(rows);

  if (insertErr) return 0;
  return rows.length;
}

/** Aus `einheiten_hinweis` („6 Wohneinheiten“) fehlende WE-Zeilen nachziehen. */
export async function ensureDefaultObjektEinheitenFromHinweis(
  objektId: string,
  einheitenHinweis?: string | null
): Promise<number> {
  return ensureDefaultObjektEinheiten(
    objektId,
    parseEinheitenCount(einheitenHinweis)
  );
}
