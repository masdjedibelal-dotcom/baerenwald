/** Ein Button im Dashboard-Aktions-Karussell. */
export type PortalDashboardActionButton = {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
  /** inline = API wie im Detail; open = Vorgang öffnen (HM/Partner). */
  mode: "inline" | "open";
};

export type PortalDashboardActionKind =
  | "hv_meldung"
  | "hv_angebot_freigabe"
  | "kunde_angebot"
  | "kunde_auftrag_aenderung"
  | "hm_pruefung"
  | "partner_offen";

export type PortalDashboardActionSlide = {
  /** Deep-Link / Listen-ID (Lead, Angebot oder Auftrag). */
  openId: string;
  leadId?: string;
  kicker: string;
  kickerTone?: "sand" | "green";
  title: string;
  subtitle?: string;
  sortTs: number;
  kind: PortalDashboardActionKind;
  buttons: PortalDashboardActionButton[];
  payload?: Record<string, string>;
};
