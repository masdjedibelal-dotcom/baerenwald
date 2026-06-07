import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalAuftragPhasenInput } from "@/lib/portal/portal-auftrag-display";
import type {
  PortalAuftragPhaseId,
  PortalAuftragPhaseState,
} from "@/lib/portal/portal-auftrag-phasen";
import type { ReactNode } from "react";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import type { PortalAnsprechpartner } from "@/lib/portal/portal-ansprechpartner";
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

export type KundePortalDetailItem = {
  id: string;
  date?: string;
  title: string;
  status?: string;
  summary?: string;
  anfrageGewerk?: string;
  anfrageVorhaben?: string;
  isAngebotDetail?: boolean;
  angebotPositionen?: PortalAngebotPositionDisplay[];
  gesamtBrutto?: number;
  isAuftragDetail?: boolean;
  auftragPhasen?: PortalAuftragPhasenInput & {
    states: Record<PortalAuftragPhaseId, PortalAuftragPhaseState>;
    aktuellePhase?: string;
  };
  auftragEndDatum?: string;
  ansprechpartner?: PortalAnsprechpartner;
  plz?: string;
  ort?: string;
  cardSubtitle?: string;
  /** Listenkarte: eigene Metazeilen (z. B. Anfragen). */
  cardMeta?: PortalListCardMeta[];
  /** Listenkarte: Zusatz unter den Metazeilen (z. B. Phasen). */
  listFooter?: ReactNode;
  infoHint?: string;
  /** Kein Ort/Name im Hero — steht bereits unter „Objekt“. */
  suppressLocationInHero?: boolean;
  sections: PortalDetailSection[];
  /** @deprecated Meilensteine — nutze milestones */
  tags?: string[];
  milestones?: PortalMilestoneItem[];
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
