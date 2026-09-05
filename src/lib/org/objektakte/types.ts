export type ObjektAnlagePortal = {
  id: string;
  bezeichnung: string;
  gewerkName: string | null;
  standort: string | null;
  einheitLabel: string | null;
  status: string;
  vorgangCount: number;
  garantieBis: string | null;
  hersteller: string | null;
  modell: string | null;
};

export type ObjektHistorieRowPortal = {
  leadId: string;
  datum: string;
  titel: string;
  einheitLabel: string | null;
  anlageLabel: string | null;
  anlageId: string | null;
  gewerkLabel: string | null;
  statusLabel: string;
  kostenLabel: string;
  kostenEuro: number | null;
  istWiederkehrend?: boolean;
};

export type ObjektKpiPortal = {
  vorgaengeGesamt: number;
  offenInArbeit: number;
  kostenLaufendesJahr: number;
  kostenOhneAngabeImJahr: number;
  anlagenAnzahl: number;
  nachGewerk: Array<{ gewerk: string; count: number }>;
};

export type ObjektAktePortalPayload = {
  anlagen: ObjektAnlagePortal[];
  historie: ObjektHistorieRowPortal[];
  kpis: ObjektKpiPortal;
};
