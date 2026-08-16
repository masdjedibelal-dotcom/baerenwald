"use client";

import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";
import { OBJ_MIETER_MENU } from "@/lib/portal2/objekte";

type Props = {
  hasEmail?: boolean;
  onEinladen: () => void;
  onVorgaenge: () => void;
  onEntfernen: () => void;
  onBearbeiten?: () => void;
};

/**
 * Mieter/Eigentümer-⋯ — globales PortalActionMenu (volle Breite Bottom Sheet).
 */
export function OrganisationObjektMieterMenu({
  onEinladen,
  onVorgaenge,
  onEntfernen,
  onBearbeiten,
}: Props) {
  const items: PortalActionMenuItem[] = [
    {
      label: OBJ_MIETER_MENU.einladen,
      onClick: onEinladen,
    },
    ...(onBearbeiten
      ? [{ label: OBJ_MIETER_MENU.bearbeiten, onClick: onBearbeiten }]
      : []),
    { label: OBJ_MIETER_MENU.vorgaenge, onClick: onVorgaenge },
    {
      label: OBJ_MIETER_MENU.entfernen,
      onClick: onEntfernen,
      danger: true,
      dividerBefore: true,
    },
  ];

  return (
    <PortalActionMenu
      title="Person"
      items={items}
      triggerLabel="Personen-Menü"
    />
  );
}
