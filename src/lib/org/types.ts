export type PortalModus =
  | "privat"
  | "organisation"
  | "eigentuemer"
  | "mieter"
  | "hausmeister";

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

export type FreigabeBypassGrund = "schwelle" | "akut";

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
  /** Dashboard-Hero (optional). */
  org_hero_url?: string | null;
  freigabe_modus: FreigabeModus;
  freigabe_schwelle_eur: number | null;
  notfall_direkt: boolean;
  /** Whitelist Sofortmaßnahme-Fall-IDs; leer = nichts geht direkt. */
  akut_fall_ids?: string[] | null;
  kleinreparatur_aktiv: boolean;
  /** Neue Meldungen automatisch an Objekt-Hausmeister (hm_pruefung). */
  hm_auto_zuweisen?: boolean;
  org_primary_color?: string | null;
  org_primary_color_dk?: string | null;
  org_primary_color_soft?: string | null;
  org_logo_kuerzel?: string | null;
  org_sub?: string | null;
  org_telefon?: string | null;
  org_strasse?: string | null;
  org_hausnummer?: string | null;
  org_plz?: string | null;
  org_ort?: string | null;
  /** Fallback aus CRM-Registrierung (kunden.strasse …). */
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
  mieter_kontakt_hinweis?: string | null;
  av_akzeptiert_am?: string | null;
  av_version?: string | null;
  av_akzeptiert_von?: string | null;
  av_text_snapshot?: string | null;
  wl_ansprache_am?: string | null;
  impressum_url?: string | null;
  datenschutz_url?: string | null;
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
  /** E1 — Migration `typ`; Fallback Meta in notizen_intern. */
  typ?: string | null;
  melde_slug: string | null;
  melde_aktiv: boolean;
  einheiten_hinweis: string | null;
  /** Count aus `objekt_einheiten` (E1 Badge / Melde). */
  einheitenCount?: number | null;
  notizen_intern: string | null;
  kostenstelle_nr?: string | null;
  freigabe_schwelle_eur?: number | null;
  /** Override Org; null = erbt kunden.notfall_direkt */
  notfall_direkt?: boolean | null;
  /** Gebäudeversicherer (Stammdaten). */
  versicherer?: string | null;
  /** Policen-Nr. am Objekt. */
  versicherungs_nr?: string | null;
  selbstbehalt_eur?: number | null;
  /** Bei Meldungen: Kostenträger Versicherung + Schadenakte automatisch. */
  automatische_schadenakte?: boolean | null;
  /** Dekoratives Gebäudefoto (öffentlich). */
  cover_url?: string | null;
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
  freigabe_bypass_grund?: FreigabeBypassGrund | null;
  mieter_vor_ort_at?: string | null;
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
  versicherungsakte_pdf_url?: string | null;
  vorgang_phase?: string | null;
  plz?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  zeitraum?: string | null;
  kontakt_name?: string | null;
  objekt?: {
    /** PortalObjekt.name oder Legacy-Titel */
    name?: string;
    titel?: string;
    strasse?: string | null;
    adresseZeile?: string;
    plz?: string | null;
    ort?: string | null;
    plzOrt?: string;
    cover_url?: string | null;
  } | null;
};
