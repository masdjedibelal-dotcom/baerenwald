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
 * TEIL E / E1 — Mock `screenObjekte` Karte:
 * Gebäudefoto · Name · Adresse · Badges · Aktionen.
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
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "relative cursor-pointer rounded-xl border bg-white transition-shadow",
        selected
          ? "border-accent shadow-[0_0_0_1px_var(--color-accent,theme(colors.accent.DEFAULT))]"
          : "border-border-default hover:shadow-md"
      )}
    >
      <button
        type="button"
        title={selected ? "Auswahl aufheben" : "Auswählen"}
        className={cn(
          "absolute left-2.5 top-2.5 z-[2] flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border text-sm font-bold shadow-sm",
          selected
            ? "border-accent bg-accent text-white"
            : "border-border-default bg-white/90 text-transparent"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        {selected ? "✓" : ""}
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <OrganisationObjektCover
          objektId={card.id}
          coverUrl={card.coverUrl}
          variant="card"
          onUploaded={onCoverUploaded}
        />
      </div>

      <div className="p-4">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary">
            {card.name}
          </p>
        </div>
        <p className="mb-1 text-[12.5px] text-text-secondary">{card.adresse}</p>
        <p className="mb-2.5 text-[12.5px] text-text-tertiary">{card.typLine}</p>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
              card.offen
                ? "bg-accent-light text-accent"
                : "bg-[#eceef0] text-text-tertiary"
            )}
          >
            {card.offen} offen
          </span>
          <span className="rounded-full bg-[#f0f2f4] px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary">
            {card.einheitenLabel}
          </span>
        </div>
        {actions ? (
          <div
            className="flex flex-wrap items-center gap-2 border-t border-border-default pt-2.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
