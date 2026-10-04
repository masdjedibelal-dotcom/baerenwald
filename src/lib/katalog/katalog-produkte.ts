
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
