import type { FachdetailsState, FunnelState } from "@/lib/funnel/types";
import { getProdukt } from "./katalog";
import type { KatalogQuelle, ProduktMeta } from "./types";

export type ProduktFunnelOverrides = {
  plz?: string;
  zeitraum?: FunnelState["zeitraum"];
  umfang?: string | null;
  wohnflaeche?: number;
  gartenQm?: number;
};

function fixFachdetails(slug: string): FachdetailsState {
  switch (slug) {
    case "fix-armatur":
      return { sanitaer: { lage: "armatur" } };
    case "fix-verstopfung":
      return { sanitaer: { lage: "verstopfung" } };
    case "fix-rohrleck":
      return { sanitaer: { lage: "wand" } };
    case "fix-wc-spuelkasten":
      return { sanitaer: { lage: "wc" } };
    case "fix-steckdose":
      return { elektro: { problem: "steckdose" } };
    case "fix-fi":
      return { elektro: { problem: "sicherung" } };
    case "fix-stromausfall":
      return { elektro: { problem: "strom_weg" } };
    case "fix-heizung-kalt":
      return { heizung: { typ: "heizung_kalt" } };
    case "fix-kein-warmwasser":
      return { heizung: { typ: "kein_warmwasser" } };
    case "fix-heizung-stoerung":
      return { heizung: { typ: "brenner_fehlermeldung" } };
    default:
      return {};
  }
}

/** Mappt Produkt-Slug auf FunnelState (Partial — wird mit Defaults gemerged). */
export function produktToFunnelState(
  slug: string,
  overrides: ProduktFunnelOverrides = {}
): FunnelState | null {
  const produkt = getProdukt(slug);
  if (!produkt) return null;

  const fachdetails: FachdetailsState =
    produkt.familie === "bad"
      ? { sanitaer: { badWas: "komplett" } }
      : produkt.familie === "fix"
        ? fixFachdetails(slug)
        : produkt.familie === "garten"
          ? { garten: { was: "pflege" } }
          : {};

  return {
    situation: produkt.situation,
    bereiche: [...produkt.bereiche],
    kundentyp: null,
    umfang: overrides.umfang ?? (produkt.familie === "garten" ? "zweimal_monat" : null),
    umfangFaktor: 1,
    groesse:
      overrides.wohnflaeche ??
      produkt.groesseQm ??
      (overrides.gartenQm != null ? overrides.gartenQm : null),
    groesseEinheit:
      overrides.wohnflaeche != null || produkt.groesseQm != null
        ? "qm"
        : overrides.gartenQm != null
          ? "qm"
          : null,
    badAusstattung:
      produkt.familie === "bad" &&
      (produkt.stufe === "standard" ||
        produkt.stufe === "komfort" ||
        produkt.stufe === "gehoben")
        ? produkt.stufe
        : null,
    plz: overrides.plz ?? "",
    zeitraum: overrides.zeitraum ?? null,
    priceMin: 0,
    priceMax: 0,
    breakdown: [],
    istFallback: false,
    komplexReason: null,
    budgetCheck: null,
    dringlichkeit: null,
    zugaenglichkeit: null,
    zustand: null,
    fachdetails,
    freitext: null,
    photos: [],
    name: "",
    vorname: "",
    nachname: "",
    leadBeschreibung: "",
    email: "",
    telefon: "",
    strasse: "",
    hausnummer: "",
    ort: "",
    selectedSlot: null,
    submitted: false,
  };
}

export function buildProduktMeta(
  slug: string,
  opts?: {
    leistungSlug?: string;
    leistungLabel?: string;
    katalogQuelle?: KatalogQuelle;
  }
): ProduktMeta | null {
  const produkt = getProdukt(slug);
  if (!produkt) return null;
  return {
    produkt_slug: produkt.slug,
    produkt_titel: produkt.titel,
    produkt_familie: produkt.familie,
    produkt_stufe: produkt.stufe,
    produkt_groesse: produkt.groesse,
    produkt_scope_version: produkt.scopeVersion,
    produkt_leistungen: produkt.leistungen,
    leistung_slug: opts?.leistungSlug,
    leistung_label: opts?.leistungLabel,
    katalog_quelle: opts?.katalogQuelle,
  };
}
