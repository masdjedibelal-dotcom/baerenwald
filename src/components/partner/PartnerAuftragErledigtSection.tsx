"use client";

import {
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";

/**
 * Erfolgszustand nach „Auftrag erledigt“ (ohne Abnahme).
 */
export function PartnerAuftragErledigtSection({
  done,
  hatAbschluss,
  layout = "section",
}: {
  auftragId?: string;
  /** Lokal nach Confirm, bis Router-Refresh greift. */
  done?: boolean;
  /** Server: erledigt_gemeldet_am oder Legacy-Signatur. */
  hatAbschluss?: boolean;
  layout?: "section" | "cta";
  /** @deprecated */
  positionen?: unknown;
  vollstaendig?: boolean;
  vorgangState?: unknown;
  auftragStatus?: string;
  defaultOrt?: string;
}) {
  if (!done && !hatAbschluss) return null;

  const success = (
    <PartnerDetailSuccessBox>
      <p className="font-semibold">Auftrag erledigt gemeldet</p>
      <p className="text-sm mt-1">Rechnung kann erstellt werden.</p>
    </PartnerDetailSuccessBox>
  );

  if (layout === "cta") {
    return <PortalDetailCard title="Abschluss">{success}</PortalDetailCard>;
  }
  return <PartnerDetailSection title="Abschluss">{success}</PartnerDetailSection>;
}
