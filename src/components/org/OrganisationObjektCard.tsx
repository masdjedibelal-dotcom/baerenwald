"use client";

import type { ReactNode } from "react";

import { OrganisationObjektCover } from "@/components/org/OrganisationObjektCover";
import { PortalListCard } from "@/components/shared/PortalListCard";
import type { ObjCardModel } from "@/lib/portal2/objekte";

type Props = {
  card: ObjCardModel;
  selected?: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  actions?: ReactNode;
  onCoverUploaded?: (url: string) => void;
};

/**
 * Objekt-Listenkarte — gleiche Shell wie Vorgänge (PortalListCard + Cover).
 */
export function OrganisationObjektCard({
  card,
  selected = false,
  onOpen,
  onToggleSelect,
  actions,
  onCoverUploaded,
}: Props) {
  return (
    <PortalListCard
      variant="responsive"
      accent="auftrag"
      showLeftAccent={false}
      selected={selected}
      onClick={onOpen}
      title={card.name}
      subtitle={card.adresse}
      statusLabel={`${card.offen} offen`}
      statusPillClass={
        card.offen
          ? "bg-accent-light text-accent"
          : "bg-[#eceef0] text-text-tertiary"
      }
      meta={[{ text: card.einheitenLabel }]}
      showCheckbox
      checked={selected}
      onCheckedChange={() => onToggleSelect()}
      showChevron
      media={
        <OrganisationObjektCover
          objektId={card.id}
          coverUrl={card.coverUrl}
          variant="card"
          className="!rounded-none"
          onUploaded={onCoverUploaded}
        />
      }
      trailingActions={actions}
    />
  );
}
