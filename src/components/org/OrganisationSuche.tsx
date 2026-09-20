"use client";

import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";

type Props = {
  onSelect: (id: string) => void;
  onSelectHit?: (hit: PortalSearchHit) => void;
};

/**
 * HV-Header-Suche — nutzt dieselbe Komponente/Hook wie Partner/Kunde.
 * Prefer onSelectHit für Objekte/Dokumente; Fallback: Vorgangs-ID.
 */
export function OrganisationSuche({ onSelect, onSelectHit }: Props) {
  return (
    <PortalHeaderSearch
      apiPath="/api/org/suche"
      role="hv"
      onSelect={(hit) => {
        if (onSelectHit) {
          onSelectHit(hit);
          return;
        }
        if (hit.group === "vorgaenge") {
          const id = hit.id.replace(/^v-/, "");
          onSelect(id);
          return;
        }
        if (typeof window !== "undefined") {
          window.location.assign(hit.href);
        }
      }}
    />
  );
}
