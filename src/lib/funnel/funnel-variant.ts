/**
 * Funnel-Varianten — ein Core (Website-Rechner), unterschiedliche Prefixe/Gates.
 *
 * Produktentscheidungen (2026-07):
 * - Web: volle Adresse (wie Lead) VOR Preis → Ergebnis → Absenden
 * - Portale: kein Trust, kein GPT-Einstieg
 * - Mieter: nur Situation „kaputt“, kein Preis
 * - HV: ein Funnel-Einstieg (Objekt ± neu, Mieter ± neu / ohne), Preis am Ende
 * - Eigentümer: wie Endkunde mit Preis; Objekte/Mieter am Anfang
 * - Servicepakete: weiter über Cards → persistLead (CRM), nicht Create-Hub
 * - Kein Termin-Block im Melde-/Create-Funnel
 */

export type FunnelChannel =
  | "web"
  | "melde_anon"
  | "portal_mieter"
  | "portal_hv"
  | "portal_eigentuemer"
  | "portal_privat";

export type FunnelVariantConfig = {
  channel: FunnelChannel;
  /** Trust-Screens + GPT-Weiche */
  showTrustAndGpt: boolean;
  /** Preisrahmen anzeigen */
  showPrice: boolean;
  /** Kontakt inkl. Straße/Nr. vor Preis (Web-Schutz) */
  contactBeforePrice: boolean;
  /** Situation fest auf kaputt */
  forceKaputt: boolean;
  /** Stammdaten-Prefix: Objekt / Mieter */
  prefix: {
    objekt: "required" | "optional" | "hidden" | "prefilled";
    objektNeu: boolean;
    mieter: "required" | "optional" | "hidden" | "prefilled" | "ohne_erlaubt";
    mieterNeu: boolean;
    einheit: boolean;
  };
  /** Web-only umfangreiche Schritte */
  include: {
    kundentyp: boolean;
    ortPlz: boolean;
    photos: boolean;
    beschreibung: boolean;
    notfallDringlichkeit: boolean;
    verwaltungInfo: boolean;
    datenschutzCheckbox: boolean;
  };
};

export const FUNNEL_VARIANT: Record<FunnelChannel, FunnelVariantConfig> = {
  web: {
    channel: "web",
    showTrustAndGpt: true,
    showPrice: true,
    contactBeforePrice: true,
    forceKaputt: false,
    prefix: {
      objekt: "hidden",
      objektNeu: false,
      mieter: "hidden",
      mieterNeu: false,
      einheit: false,
    },
    include: {
      kundentyp: true,
      ortPlz: true,
      photos: true,
      beschreibung: false,
      notfallDringlichkeit: true,
      verwaltungInfo: false,
      datenschutzCheckbox: true,
    },
  },
  melde_anon: {
    channel: "melde_anon",
    showTrustAndGpt: false,
    showPrice: false,
    contactBeforePrice: false,
    forceKaputt: true,
    prefix: {
      objekt: "prefilled",
      objektNeu: false,
      mieter: "hidden",
      mieterNeu: false,
      einheit: true,
    },
    include: {
      kundentyp: false,
      ortPlz: false,
      photos: true,
      beschreibung: true,
      notfallDringlichkeit: true,
      verwaltungInfo: true,
      datenschutzCheckbox: true,
    },
  },
  portal_mieter: {
    channel: "portal_mieter",
    showTrustAndGpt: false,
    showPrice: false,
    contactBeforePrice: false,
    forceKaputt: true,
    prefix: {
      objekt: "prefilled",
      objektNeu: false,
      mieter: "prefilled",
      mieterNeu: false,
      einheit: true,
    },
    include: {
      kundentyp: false,
      ortPlz: false,
      photos: true,
      beschreibung: true,
      notfallDringlichkeit: true,
      verwaltungInfo: false,
      datenschutzCheckbox: true,
    },
  },
  portal_hv: {
    channel: "portal_hv",
    showTrustAndGpt: false,
    showPrice: true,
    contactBeforePrice: false,
    forceKaputt: false,
    prefix: {
      objekt: "required",
      objektNeu: true,
      mieter: "ohne_erlaubt",
      mieterNeu: true,
      einheit: true,
    },
    include: {
      kundentyp: false,
      ortPlz: false,
      photos: true,
      beschreibung: true,
      notfallDringlichkeit: true,
      verwaltungInfo: false,
      datenschutzCheckbox: false,
    },
  },
  portal_eigentuemer: {
    channel: "portal_eigentuemer",
    showTrustAndGpt: false,
    showPrice: true,
    contactBeforePrice: false,
    forceKaputt: false,
    prefix: {
      objekt: "required",
      objektNeu: false,
      mieter: "optional",
      mieterNeu: true,
      einheit: true,
    },
    include: {
      kundentyp: false,
      ortPlz: false,
      photos: true,
      beschreibung: true,
      notfallDringlichkeit: true,
      verwaltungInfo: false,
      datenschutzCheckbox: true,
    },
  },
  portal_privat: {
    channel: "portal_privat",
    showTrustAndGpt: false,
    showPrice: true,
    contactBeforePrice: false,
    forceKaputt: false,
    prefix: {
      objekt: "hidden",
      objektNeu: false,
      mieter: "hidden",
      mieterNeu: false,
      einheit: false,
    },
    include: {
      kundentyp: false,
      ortPlz: true,
      photos: true,
      beschreibung: true,
      notfallDringlichkeit: true,
      verwaltungInfo: false,
      datenschutzCheckbox: true,
    },
  },
};

export function funnelVariant(channel: FunnelChannel): FunnelVariantConfig {
  return FUNNEL_VARIANT[channel];
}
