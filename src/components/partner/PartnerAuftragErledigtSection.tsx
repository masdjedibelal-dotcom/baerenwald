"use client";

import {
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { allePartnerPositionenErledigt } from "@/lib/partner/partner-position-erledigt";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import type { VorgangState } from "@/lib/partner/vorgang-state";

/**
 * Nur Erfolgszustand nach Abschluss.
 * CTA + Multi-Step-Formular: Header-Button → PartnerAbnahmeAbschlussSheet.
 */
export function PartnerAuftragErledigtSection({
  positionen,
  done,
  vollstaendig: _vollstaendig,
  layout = "section",
}: {
  auftragId?: string;
  auftragStatus?: string;
  positionen: PartnerAuftragPosition[];
  vorgangState?: VorgangState;
  defaultOrt?: string;
  layout?: "section" | "cta";
  /** Lokal nach Modal-Submit, bis Router-Refresh greift. */
  done?: boolean;
  vollstaendig?: boolean;
}) {
  const alleErledigt = allePartnerPositionenErledigt(positionen);
  if (!alleErledigt && !done) return null;

  const success = (
    <PartnerDetailSuccessBox>
      <p className="font-semibold">Auftrag abgeschlossen</p>
    </PartnerDetailSuccessBox>
  );

  if (layout === "cta") {
    return <PortalDetailCard title="Abschluss">{success}</PortalDetailCard>;
  }
  return <PartnerDetailSection title="Abschluss">{success}</PartnerDetailSection>;
}
