import {
  aggregateAuftragHandwerkerStatus,
  resolveAuftragPortalPhase,
} from "@/lib/partner/partner-portal-phase";
import {
  partnerAuftragAnfragePortalUrl,
  partnerDashboardUrl,
  partnerOffenPortalPath,
} from "@/lib/partner/partner-site-url";

const HW_BEANTWORTET = new Set(["akzeptiert", "abgelehnt"]);

export type ZuweisungPortalLinkInput = {
  auftragId: string;
  auftragStatus: string;
  zuweisungStatuses: string[];
  positionStatuses: Array<string | null | undefined>;
  angebotHandwerker?: {
    id: string;
    status: string;
    antwort_at?: string | null;
    gesendet_at?: string | null;
    hw_eingereicht_at?: string | null;
    hw_status?: string | null;
    bestaetigt_at?: string | null;
  } | null;
};

/** Ziel-URL für Zuweisungs-Mails — Tab Offen oder Meine Aufträge. */
export function resolveZuweisungPortalUrl(input: ZuweisungPortalLinkInput): string {
  const hwStatus = aggregateAuftragHandwerkerStatus(
    input.zuweisungStatuses,
    input.positionStatuses
  );
  const portalPhase = resolveAuftragPortalPhase(input.auftragStatus, hwStatus);

  if (portalPhase === "anfrage" && !HW_BEANTWORTET.has(hwStatus.toLowerCase())) {
    const ah = input.angebotHandwerker;
    if (ah?.id && !ah.bestaetigt_at) {
      return `${partnerDashboardUrl()}?section=vorgaenge&id=${encodeURIComponent(ah.id)}`;
    }
    return partnerAuftragAnfragePortalUrl(input.auftragId);
  }

  return `${partnerDashboardUrl()}?section=vorgaenge&id=${encodeURIComponent(input.auftragId)}`;
}

export function resolveAngebotHandwerkerPortalUrl(anfrageId: string): string {
  return partnerOffenPortalPath(anfrageId);
}
