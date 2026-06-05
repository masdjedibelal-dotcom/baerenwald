import {
  aggregateAuftragHandwerkerStatus,
  resolveAngebotHandwerkerPhase,
  resolveAuftragPortalPhase,
} from "@/lib/partner/partner-portal-phase";
import {
  partnerAnfragePortalUrl,
  partnerAngebotPortalUrl,
  partnerAuftragAnfragePortalUrl,
  partnerDashboardUrl,
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
  } | null;
};

/** Ziel-URL für die „Leistung zugewiesen“-Mail — nie Tab Aufträge bei offener Zuweisung. */
export function resolveZuweisungPortalUrl(input: ZuweisungPortalLinkInput): string {
  const hwStatus = aggregateAuftragHandwerkerStatus(
    input.zuweisungStatuses,
    input.positionStatuses
  );
  const portalPhase = resolveAuftragPortalPhase(input.auftragStatus, hwStatus);

  if (portalPhase === "anfrage" && !HW_BEANTWORTET.has(hwStatus.toLowerCase())) {
    return partnerAuftragAnfragePortalUrl(input.auftragId);
  }

  const ah = input.angebotHandwerker;
  if (ah) {
    const angebotPhase = resolveAngebotHandwerkerPhase({
      status: ah.status,
      antwort_at: ah.antwort_at ?? undefined,
      gesendet_at: ah.gesendet_at ?? undefined,
      hw_eingereicht_at: ah.hw_eingereicht_at ?? undefined,
      hw_status: ah.hw_status ?? undefined,
    });
    if (angebotPhase === "angebot") {
      return partnerAngebotPortalUrl(ah.id);
    }
    if (angebotPhase === "anfrage") {
      return partnerAnfragePortalUrl(ah.id);
    }
  }

  return partnerDashboardUrl();
}
