export type PortalModus = "privat" | "organisation";

export type LeadAnlass =
  | "meldung"
  | "projekt"
  | "servicepaket"
  | "katalog"
  | "fixauftrag"
  | "sonstiges";

export type ErfassungVon = "melder" | "organisation" | "crm";

export type EinladungStatus = "offen" | "ergaenzt" | "entfallen";

export type OrgFreigabeStatus =
  | "nicht_noetig"
  | "ausstehend"
  | "freigegeben"
  | "abgelehnt";

export type ServiceModus = "paket" | "einzeln";

export type FreigabeModus = "direkt" | "freigabe";

export type MeldeKategorie =
  | "notfall"
  | "schaden"
  | "reparatur"
  | "sonstiges";

export type OrganisationKunde = {
  id: string;
  name: string | null;
  email: string | null;
  portal_modus: PortalModus;
  org_kennung: string | null;
  org_anzeigename: string | null;
  org_logo_url: string | null;
  freigabe_modus: FreigabeModus;
  freigabe_schwelle_eur: number | null;
  notfall_direkt: boolean;
  kleinreparatur_aktiv: boolean;
  kleinreparatur_schwelle_eur: number;
};

export type HvMeldungStatus =
  | "neu"
  | "notmassnahme"
  | "angebot_eingefordert"
  | "kleinreparatur"
  | "abgelehnt"
  | "abgeschlossen";

export type OrganisationObjekt = {
  id: string;
  kunde_id: string;
  titel: string;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  melde_slug: string | null;
  melde_aktiv: boolean;
  einheiten_hinweis: string | null;
  notizen_intern: string | null;
  kostenstelle_nr?: string | null;
  created_at?: string | null;
};

export type OrganisationLead = {
  id: string;
  situation?: string | null;
  bereiche?: string[] | null;
  status?: string | null;
  created_at?: string | null;
  anlass?: LeadAnlass | null;
  erfassung_von?: ErfassungVon | null;
  melder_name?: string | null;
  melder_einheit?: string | null;
  melder_telefon?: string | null;
  melder_email?: string | null;
  einladung_token?: string | null;
  einladung_status?: EinladungStatus | null;
  org_freigabe_status?: OrgFreigabeStatus | null;
  hv_meldung_status?: HvMeldungStatus | null;
  preis_unsicher?: boolean | null;
  service_modus?: ServiceModus | null;
  preis_min?: number | null;
  preis_max?: number | null;
  kontakt_nachricht?: string | null;
  funnel_daten?: unknown;
  kunde_objekt_id?: string | null;
  auftraggeber_kunde_id?: string | null;
  kunde_id?: string | null;
  kostentraeger?: string | null;
  kostentraeger_vorgeschlagen?: boolean | null;
  versicherungs_nr?: string | null;
  vorgang_phase?: string | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  zeitraum?: string | null;
  kontakt_name?: string | null;
  objekt?: {
    titel: string;
    adresseZeile?: string;
    plzOrt?: string;
  } | null;
};
