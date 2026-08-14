"use client";

import {
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";

/**
 * Nur Erfolgszustand nach echtem Abschluss (Signatur / Freigabe),
 * nicht schon wenn Positionen nur dokumentiert sind.
 */
export function PartnerAuftragErledigtSection({
  done,
  hatAbschluss,
  layout = "section",
}: {
  auftragId?: string;
  /** Lokal nach Modal-Submit, bis Router-Refresh greift. */
  done?: boolean;
  /** Server: Signatur oder Freigabe-Status gesetzt. */
  hatAbschluss?: boolean;
  layout?: "section" | "cta";
  /** @deprecated ungenutzt — Positionen allein gelten nicht als Abschluss. */
  positionen?: unknown;
  vollstaendig?: boolean;
  vorgangState?: unknown;
  auftragStatus?: string;
  defaultOrt?: string;
}) {
  if (!done && !hatAbschluss) return null;

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
