import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalAuftragPositionDisplay } from "@/lib/portal/kunde-auftrag-aenderung";
import type { PortalAuftragPhasenInput } from "@/lib/portal/portal-auftrag-display";
import type {
  PortalAuftragPhaseId,
  PortalAuftragPhaseState,
} from "@/lib/portal/portal-auftrag-phasen";
import type { ReactNode } from "react";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import type { PortalAnsprechpartner } from "@/lib/portal/portal-ansprechpartner";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
import type { PortalTerminSlot } from "@/lib/portal/portal-termin";

import type { MeldeUrsachenCheckState } from "@/lib/org/melde-ursachen";

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

/** Deep-Link `?id=` kann Lead-, Angebots- oder Auftrags-ID sein. */
export function findKundeVorgangByQueryId<
  T extends { id: string; leadId?: string },
>(items: readonly T[], queryId: string | null | undefined): T | null {
  const id = queryId?.trim();
  if (!id) return null;
  return (
    items.find((i) => i.id === id) ??
    items.find((i) => i.leadId === id) ??
    null
  );
}

export type PortalAbnahmeCheckliste = {
  leistungen: Array<{ name: string; ok?: boolean }>;
  maengel: Array<{ titel: string; status?: string | null }>;
};

export type KundePortalDetailItem = {
  id: string;
  /** Lead-ID falls vom Vorgang abweichend (z. B. Angebot/Auftrag). */
  leadId?: string;
  date?: string;
  title: string;
  status?: string;
  statusPillKey?: string;
  vorgangPhase?: string;
  needsAction?: boolean;
  /** CRM-Resolver: rollenspezifischer Hinweis (z. B. „Freigabe ausstehend“). */
  actionHint?: string;
  summary?: string;
  anfrageGewerk?: string;
  anfrageVorhaben?: string;
  isAngebotDetail?: boolean;
  angebotPositionen?: PortalAngebotPositionDisplay[];
  auftragPositionen?: PortalAuftragPositionDisplay[];
  gesamtBrutto?: number;
  /** D11: `angebote.herkunft` (z. B. handwerker → Empfohlenes Angebot). */
  angebotHerkunft?: string | null;
  isAuftragDetail?: boolean;
  /** HW-Teil-/Gesamtabnahme: Leistungen + Mängel (Abschluss-Ansicht). */
  abnahmeCheckliste?: PortalAbnahmeCheckliste | null;
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
  /** Gebäudefoto für Detail-Cover (Fallback: Portal-Default). */
  coverUrl?: string | null;
  sections: PortalDetailSection[];
  /** @deprecated Meilensteine — nutze milestones */
  tags?: string[];
  milestones?: PortalMilestoneItem[];
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
  /** Keine Preise anzeigen (Mieter über Hausverwaltung). */
  hidePreise?: boolean;
  /** HV-Mieter: vereinfachte Ansicht ohne Leistungen/Angebot. */
  hvMieterView?: boolean;
  terminAuftragId?: string;
  terminSlots?: PortalTerminSlot[];
  /** Feedback nach HW-Abschluss oder CRM-Abschluss. */
  feedbackBereit?: boolean;
  mieterFeedback?: { sterne: number; freitext?: string | null } | null;
  /** HV: Link zum Mieter-Status (kein Mieter-Mail). */
  melderStatusUrl?: string;
  /** Einheitliche Detail-Blöcke (Objekt/Melder/Freigabe). */
  melderName?: string | null;
  melderEinheit?: string | null;
  melderTelefon?: string | null;
  melderEmail?: string | null;
  kostentraeger?: string | null;
  kostentraegerVorgeschlagen?: boolean;
  versicherungsNr?: string | null;
  meldeFotos?: string[];
  orgFreigabeStatus?: string | null;
  /** CRM: schwelle | akut — Auto-Auftrag ohne HV-Annahme */
  freigabeBypassGrund?: string | null;
  /** Funnel Sofortmaßnahme (direktauftrag) */
  funnelDirektauftrag?: boolean | null;
  hvMeldungStatus?: string | null;
  /** Melde-Adresse (Lead / Objekt) */
  meldeStrasse?: string | null;
  meldeHausnummer?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  /** Fachfragen (Frage → Antwort) aus dem Melde-Funnel */
  meldeFachdetails?: Array<{ label: string; value: string }>;
  /** Roh-Antworten für Ursachen-Matching (Wasser …) */
  meldeFachdetailAnswers?: Record<string, string | string[] | undefined>;
  /** Gespeicherter Ursachen-Check (funnel_daten.ursachen_check) */
  meldeUrsachenCheck?: MeldeUrsachenCheckState | null;
  /**
   * Unverbindliche Preisindikation aus Mieter-Meldung (preis_min/max).
   * Nur für HV-Ansicht befüllen / anzeigen — nicht für Mieter.
   */
  meldePreisIndikation?: string | null;
  /** C4 — HV Meta „Wartet auf HW · …“ */
  wartetAufHwLabel?: string | null;
  /** Ausführung: zugewiesene Handwerker-Firma (nicht Betreuer/Ansprechpartner). */
  handwerkerName?: string | null;
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
