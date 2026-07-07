import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
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
  const { data: produkte } = await supabaseAdmin
    .from("katalog_produkte")
    .select("*")
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

  if (!produkte?.length) return [];

  const slugs = produkte.map((p) => p.slug);
  const { data: preise } = await supabaseAdmin
    .from("katalog_preise")
    .select("*")
    .in("produkt_slug", slugs)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

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

export function groessenklasseFromM2(m2: number): string {
  if (m2 <= 45) return "bis_45";
  if (m2 <= 75) return "46_75";
  if (m2 <= 100) return "76_100";
  return "ueber_100";
}

export async function resolveStufe1Basis(groessenklasse: string): Promise<number | null> {
  const produkte = await loadKatalogProdukte();
  const stufe1 = produkte.find((p) => p.slug === "uebergabe-stufe-1");
  const row = stufe1?.preise.find((p) => p.groessenklasse === groessenklasse);
  return row?.preis_fix ?? null;
}

/** m²-Band: Stufe-1-Basis + m² × Satz (z. B. Neuvermietungsfertig). */
export async function resolveM2BandBetrag(
  produkt: KatalogProdukt,
  m2: number
): Promise<number | null> {
  if (produkt.preis_typ !== "m2_band" || m2 <= 0) return null;
  const klasse = groessenklasseFromM2(m2);
  const basis = await resolveStufe1Basis(klasse);
  const m2Satz = produkt.preise[0]?.m2_satz ?? 0;
  if (basis == null || m2Satz <= 0) return null;
  return basis + m2 * m2Satz;
}

export function groessenklasseLabel(klasse: string | null): string {
  switch (klasse) {
    case "bis_45":
      return "bis 45 m²";
    case "46_75":
      return "46–75 m²";
    case "76_100":
      return "76–100 m²";
    case "ueber_100":
      return "über 100 m²";
    default:
      return klasse ?? "";
  }
}

export function formatProduktPreis(produkt: KatalogProdukt): string {
  if (produkt.preis_typ === "fix" && produkt.preise.length) {
    const min = Math.min(...produkt.preise.map((p) => p.preis_fix ?? Infinity));
    const max = Math.max(...produkt.preise.map((p) => p.preis_fix ?? 0));
    if (min === max && min < Infinity) return `${min} € netto`;
    if (min < Infinity && max > 0) return `ab ${min} € netto`;
  }
  if (produkt.preis_typ === "m2_band" && produkt.preise[0]) {
    const p = produkt.preise[0];
    if (p.preis_min != null && p.preis_max != null) {
      return `${p.preis_min}–${p.preis_max} €/m² netto`;
    }
  }
  if (produkt.preis_typ === "band" && produkt.preise[0]) {
    const p = produkt.preise[0];
    if (p.preis_min != null && p.preis_max != null) {
      return `${p.preis_min}–${p.preis_max} € netto`;
    }
  }
  if (produkt.preis_typ === "stundensatz" && produkt.preise[0]?.stundensatz) {
    return `${produkt.preise[0].stundensatz} €/h netto`;
  }
  return "Angebot";
}

/** Direktbestellung wenn Fixpreis + unter Freigabe-Schwelle. */
export function istDirektbestellung(
  produkt: KatalogProdukt,
  betragNetto: number,
  freigabeSchwelle: number | null,
  freigabeModus: string
): boolean {
  if (!produkt.has_fixpreis && produkt.preis_typ !== "fix") return false;
  if (freigabeModus !== "freigabe") return true;
  if (freigabeSchwelle == null || freigabeSchwelle <= 0) return false;
  return betragNetto <= freigabeSchwelle;
}

export type BestellInput = {
  produktSlug: string;
  kundeObjektId: string;
  groessenklasse?: string;
  m2?: number;
  notiz?: string;
};

export function resolveBestellBetrag(
  produkt: KatalogProdukt,
  groessenklasse?: string,
  m2?: number
): number | null {
  if (produkt.preis_typ === "fix") {
    const row =
      produkt.preise.find((p) => p.groessenklasse === groessenklasse) ?? produkt.preise[0];
    return row?.preis_fix ?? null;
  }
  if (produkt.preis_typ === "m2_fix" && m2 && produkt.preise[0]?.m2_satz) {
    return m2 * produkt.preise[0].m2_satz;
  }
  if (produkt.familie === "service" && produkt.preis_typ === "fix") {
    return produkt.preise[0]?.preis_fix ?? null;
  }
  return null;
}

export async function resolveBestellBetragAsync(
  produkt: KatalogProdukt,
  opts: { groessenklasse?: string; m2?: number }
): Promise<{ betrag: number | null; preisUnsicher: boolean }> {
  if (produkt.preis_typ === "m2_band") {
    if (!opts.m2 || opts.m2 <= 0) {
      return { betrag: null, preisUnsicher: true };
    }
    const betrag = await resolveM2BandBetrag(produkt, opts.m2);
    return { betrag, preisUnsicher: betrag == null };
  }
  const betrag = resolveBestellBetrag(produkt, opts.groessenklasse, opts.m2);
  return { betrag, preisUnsicher: betrag == null && produkt.preis_typ !== "fix" };
}

export async function loadEinheitFlaeche(einheitId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("wohnflaeche_m2")
    .eq("id", einheitId)
    .eq("aktiv", true)
    .maybeSingle();
  return data?.wohnflaeche_m2 != null ? Number(data.wohnflaeche_m2) : null;
}

export async function loadObjektFlaeche(objektId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("wohnflaeche_m2")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.wohnflaeche_m2 != null ? Number(data.wohnflaeche_m2) : null;
}
