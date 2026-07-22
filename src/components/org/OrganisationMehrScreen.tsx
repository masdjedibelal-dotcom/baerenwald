"use client";

import { PortalNavIcon } from "@/components/shared/PortalNavIcon";
import {
  PORTAL_HV_MEHR_TILES,
  portalNavSectionId,
  type PortalNavKey,
} from "@/lib/portal2/nav-items";
import { PORTAL_C } from "@/lib/portal2/tokens";

type Props = {
  onOpen: (sectionId: string) => void;
};

/**
 * Mobile „Mehr“ — Kacheln für Serviceabos und Einstellungen.
 */
export function OrganisationMehrScreen({ onOpen }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-[18px] font-bold text-text-primary"
          style={{ fontFamily: PORTAL_C.head }}
        >
          Mehr
        </h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Service und Einstellungen
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PORTAL_HV_MEHR_TILES.map((tile) => {
          const sectionId = portalNavSectionId("org", tile.key);
          if (!sectionId) return null;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => onOpen(sectionId)}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-border-default bg-white p-4 text-center shadow-sm transition-colors hover:border-accent hover:bg-accent-light/40 active:scale-[0.98]"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-xl"
                style={{
                  background: "var(--accent-light, #E7F1E9)",
                  color: "var(--org-primary, var(--accent, #2E7D52))",
                }}
              >
                <PortalNavIcon
                  navId={tile.key as PortalNavKey}
                  active
                  surface="nav"
                  size={22}
                />
              </span>
              <span className="text-[13px] font-bold text-text-primary">
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
