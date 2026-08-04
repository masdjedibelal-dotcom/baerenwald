import type { FunnelState } from "@/lib/funnel/types";
import { LEISTUNGEN_DATA } from "@/lib/leistungen/data";
import { getProdukt } from "@/lib/products/katalog";
import { buildProduktMeta } from "@/lib/products/produkt-to-funnel";
import type { KatalogQuelle, ProduktMeta } from "@/lib/products/types";
import { normalizeLeistungSlug } from "@/lib/leistungen/leistung-produkt-map";

export type EnrichLeadContext = {
  produktSlug?: string;
  leistungSlug?: string;
  katalogQuelle?: KatalogQuelle;
  funnelQuelle?: string;
};

export function enrichFunnelDatenForLead(
  funnelDaten: Record<string, unknown>,
  ctx: EnrichLeadContext
): Record<string, unknown> {
  const produktSlug = ctx.produktSlug?.trim();
  const leistungKey = ctx.leistungSlug
    ? normalizeLeistungSlug(ctx.leistungSlug)
    : undefined;
  const leistungData = leistungKey ? LEISTUNGEN_DATA[leistungKey] : undefined;

  let produktMeta: ProduktMeta | null = null;
  if (produktSlug) {
    produktMeta = buildProduktMeta(produktSlug, {
      leistungSlug: leistungKey,
      leistungLabel: leistungData?.label,
      katalogQuelle: ctx.katalogQuelle,
    });
  }

  return {
    ...funnelDaten,
    ...(produktMeta ? { produkt: produktMeta } : {}),
    ...(leistungKey
      ? {
          leistung_slug: leistungKey,
          leistung_label: leistungData?.label ?? leistungKey,
        }
      : {}),
    ...(ctx.katalogQuelle ? { katalog_quelle: ctx.katalogQuelle } : {}),
    ...(ctx.funnelQuelle ? { funnel_quelle: ctx.funnelQuelle } : {}),
  };
}

export function buildProduktLeadFunnelDaten(
  state: FunnelState,
  ctx: EnrichLeadContext
): Record<string, unknown> {
  const { photos, ...rest } = state;
  return enrichFunnelDatenForLead(
    {
      ...rest,
      photoCount: photos.length,
      photos: [],
    },
    ctx
  );
}

export function getProduktLabel(slug: string): string | null {
  return getProdukt(slug)?.titel ?? null;
}

export function formatProduktSummaryLine(meta: ProduktMeta | undefined): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (meta.leistung_label) parts.push(`Leistung: ${meta.leistung_label}`);
  parts.push(`Paket: ${meta.produkt_titel}`);
  return parts.join(" · ");
}
