"use client";

import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";

type Props = {
  onEinladen: () => void;
  onEntfernen: () => void;
  onBearbeiten?: () => void;
  /** Ohne E-Mail: Link-Senden disabled. */
  canEinladen?: boolean;
};

/**
 * Hausmeister-⋯ am Objekt: Portal-Link senden · Löschen (Popover).
 */
export function OrganisationObjektHausmeisterMenu({
  onEinladen,
  onEntfernen,
  onBearbeiten,
  canEinladen = true,
}: Props) {
  const items: PortalActionMenuItem[] = [
    {
      label: "Portal-Link senden",
      onClick: onEinladen,
      disabled: !canEinladen,
    },
    ...(onBearbeiten
      ? [{ label: "Bearbeiten", onClick: onBearbeiten }]
      : []),
    {
      label: "Löschen",
      onClick: onEntfernen,
      danger: true,
      dividerBefore: true,
    },
  ];

  return (
    <PortalActionMenu
      title="Hausmeister"
      items={items}
      variant="popover"
      triggerLabel="Hausmeister-Menü"
    />
  );
}
