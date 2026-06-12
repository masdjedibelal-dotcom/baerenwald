import { getProdukt } from "./katalog";
import type { KatalogQuelle } from "./types";

export type RechnerUrlParams = {
  produkt?: string;
  leistung?: string;
  modus?: "katalog" | "funnel";
  quelle?: KatalogQuelle;
  next?: string;
};

/** Katalog-Produkt → Detailrechner mit passendem Leistungs-Preset. */
export function buildRechnerUrlFromProdukt(
  produktSlug: string,
  quelle?: KatalogQuelle
): string {
  const produkt = getProdukt(produktSlug);
  const leistung =
    produkt?.leistungSlugs[0] ??
    (produkt?.familie === "bad"
      ? "badezimmer-sanierung"
      : produkt?.familie === "garten"
        ? "gartenpflege"
        : produkt?.familie === "hausservice"
          ? "hausmeister"
          : undefined);

  return buildRechnerUrl({
    modus: "katalog",
    produkt: produktSlug,
    leistung,
    quelle,
  });
}

export function buildRechnerUrl(params: RechnerUrlParams): string {
  const q = new URLSearchParams();
  if (params.modus) q.set("modus", params.modus);
  if (params.produkt) q.set("produkt", params.produkt);
  if (params.leistung) q.set("leistung", params.leistung);
  if (params.quelle) q.set("quelle", params.quelle);
  if (params.next) q.set("next", params.next);
  const qs = q.toString();
  return qs ? `/rechner?${qs}` : "/rechner";
}

export function buildLeistungKonverterHref(
  leistungSlug: string,
  produktSlug?: string
): string {
  const base = `/leistungen/${leistungSlug}-muenchen#konverter`;
  if (!produktSlug) return base;
  return `${base}?produkt=${encodeURIComponent(produktSlug)}`;
}

export function leistungHrefWithKonverter(
  leistungPageSlug: string,
  produktSlug?: string
): string {
  const hash = produktSlug
    ? `#konverter?produkt=${encodeURIComponent(produktSlug)}`
    : "#konverter";
  return `/leistungen/${leistungPageSlug}${hash}`;
}
