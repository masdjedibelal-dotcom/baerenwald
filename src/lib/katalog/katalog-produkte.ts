import { logDbError } from '@/lib/errors/log-db-error';
import { supabaseAdmin } from "@/lib/supabase";

export type KatalogProdukt = {
  slug: string;
  bezeichnung: string;
  familie: string;
  preis_typ: string;
  lohnanteil_prozent: number;
  has_fixpreis: boolean;
  beschreibung: string | null;
  scope_json: Record<string, unknown>;
  preise: Array<{
    id: string;
    groessenklasse: string | null;
    preis_min: number | null;
    preis_max: number | null;
    preis_fix: number | null;
    stundensatz: number | null;
    m2_satz: number | null;
    lohnanteil_prozent: number | null;
  }>;
};

export async function loadKatalogProdukte(): Promise<KatalogProdukt[]> {
  const {data: produkte, error: __dbErr257_1} = await supabaseAdmin
    .from("katalog_produkte")
    .select("*")
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });
  if (__dbErr257_1) logDbError('lib/katalog/katalog-produkte:katalog_produkte', __dbErr257_1)
  if (!produkte?.length) return [];

  const slugs = produkte.map((p) => p.slug);
  const {data: preise, error: __dbErr258_2} = await supabaseAdmin
    .from("katalog_preise")
    .select("*")
    .in("produkt_slug", slugs)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });
  if (__dbErr258_2) logDbError('lib/katalog/katalog-produkte:katalog_preise', __dbErr258_2)
  const preiseBySlug = new Map<string, KatalogProdukt["preise"]>();
  for (const pr of preise ?? []) {
    const list = preiseBySlug.get(String(pr.produkt_slug)) ?? [];
    list.push({
      id: String(pr.id),
      groessenklasse: pr.groessenklasse as string | null,
      preis_min: pr.preis_min != null ? Number(pr.preis_min) : null,
      preis_max: pr.preis_max != null ? Number(pr.preis_max) : null,
      preis_fix: pr.preis_fix != null ? Number(pr.preis_fix) : null,
      stundensatz: pr.stundensatz != null ? Number(pr.stundensatz) : null,
      m2_satz: pr.m2_satz != null ? Number(pr.m2_satz) : null,
      lohnanteil_prozent:
        pr.lohnanteil_prozent != null ? Number(pr.lohnanteil_prozent) : null,
    });
    preiseBySlug.set(String(pr.produkt_slug), list);
  }

  return produkte.map((p) => ({
    slug: String(p.slug),
    bezeichnung: String(p.bezeichnung),
    familie: String(p.familie),
    preis_typ: String(p.preis_typ),
    lohnanteil_prozent: Number(p.lohnanteil_prozent ?? 85),
    has_fixpreis: Boolean(p.has_fixpreis),
    beschreibung: p.beschreibung as string | null,
    scope_json: (p.scope_json as Record<string, unknown>) ?? {},
    preise: preiseBySlug.get(String(p.slug)) ?? [],
  }));
}
