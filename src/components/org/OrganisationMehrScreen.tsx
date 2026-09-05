"use client";

import { PortalNavIcon } from "@/components/shared/PortalNavIcon";
import {
  PortalListeEyebrow,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import {
  PORTAL_HV_MEHR_TILES,
  portalNavSectionId,
  type PortalNavKey,
} from "@/lib/portal2/nav-items";

type Props = {
  onOpen: (sectionId: string) => void;
};

/**
 * Mobile „Mehr“ — Kacheln für Serviceabos, Marktplatz und Einstellungen.
 */
export function OrganisationMehrScreen({ onOpen }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <PortalListeEyebrow>Menü</PortalListeEyebrow>
        <PortalListeTitle>Mehr</PortalListeTitle>
        <p className="mt-1 text-[14px] text-[#55615B]">
          Service, Marktplatz und Einstellungen
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
              className="portal-mehr-tile"
            >
              <span className="portal-mehr-tile-icon">
                <PortalNavIcon
                  navId={tile.key as PortalNavKey}
                  active
                  surface="nav"
                  size={22}
                />
              </span>
              <span className="portal-mehr-tile-label">{tile.label}</span>
              {tile.tag ? (
                <span className="portal-mehr-tile-tag" aria-label={tile.tag}>
                  {tile.tag}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
