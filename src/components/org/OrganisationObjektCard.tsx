"use client";

import type { ReactNode } from "react";

import { OrganisationObjektCover } from "@/components/org/OrganisationObjektCover";
import type { ObjCardModel } from "@/lib/portal2/objekte";
import { cn } from "@/lib/utils";

type Props = {
  card: ObjCardModel;
  selected?: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  actions?: ReactNode;
  onCoverUploaded?: (url: string) => void;
};

/**
 * Deep Green Objektkarte — Cover 152 px, „N offen“-Pill, Name/Adresse/Meta.
 */
export function OrganisationObjektCard({
  card,
  selected = false,
  onOpen,
  onToggleSelect,
  actions,
  onCoverUploaded,
}: Props) {
  const offenLabel =
    card.offen === 1 ? "1 offen" : `${card.offen} offen`;
  const metaParts = [
    card.einheitenLabel,
    card.pruefpflichtFaellig
      ? `${card.pruefpflichtFaellig} fällig`
      : null,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "portal-objekt-card",
        selected && "portal-objekt-card--selected"
      )}
    >
      <div className="portal-objekt-card-media">
        <OrganisationObjektCover
          objektId={card.id}
          coverUrl={card.coverUrl}
          variant="card"
          className="portal-objekt-card-cover"
          onUploaded={onCoverUploaded}
        />
        <div className="portal-objekt-card-media-fade" aria-hidden />
        {card.offen > 0 ? (
          <span className="portal-objekt-card-offen">{offenLabel}</span>
        ) : null}
        <label
          className="portal-objekt-card-check"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect()}
            aria-label={`${card.name} auswählen`}
          />
        </label>
      </div>

      <button
        type="button"
        className="portal-objekt-card-body"
        onClick={onOpen}
      >
        <span className="portal-objekt-card-name">{card.name}</span>
        <span className="portal-objekt-card-adresse">{card.adresse}</span>
        {metaParts.length > 0 ? (
          <span className="portal-objekt-card-meta">
            {metaParts.join(" · ")}
          </span>
        ) : null}
      </button>

      {actions ? (
        <div
          className="portal-objekt-card-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}
