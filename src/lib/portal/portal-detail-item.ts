import type { PortalDetailSection } from "@/lib/portal/portal-display";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";

export type PortalBautagebuchEntry = {
  id?: string;
  datum?: string;
  created_at?: string;
  titel?: string;
  notiz?: string;
  fotos_urls?: string[];
};

export type PortalMilestoneItem = {
  id: string;
  titel: string;
  erledigt: boolean;
};

export type PortalBetreuer = {
  name: string;
  email?: string;
  phone?: string;
};

export type KundePortalDetailItem = {
  id: string;
  date?: string;
  title: string;
  status?: string;
  summary?: string;
  anfrageGewerk?: string;
  anfrageVorhaben?: string;
  plz?: string;
  ort?: string;
  cardSubtitle?: string;
  infoHint?: string;
  sections: PortalDetailSection[];
  /** @deprecated Meilensteine — nutze milestones */
  tags?: string[];
  milestones?: PortalMilestoneItem[];
  betreuer?: PortalBetreuer;
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
};

export function objektPlzOrt(
  obj?: { plz?: string | null; ort?: string | null } | null,
  fallbackPlz?: string | null
): { plz: string; ort: string } {
  return {
    plz: obj?.plz?.trim() || fallbackPlz?.trim() || "—",
    ort: obj?.ort?.trim() || "—",
  };
}
