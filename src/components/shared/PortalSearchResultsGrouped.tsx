"use client";

import { PortalButton } from "@/components/portal/PortalButton";
import { PortalIcon } from "@/components/portal/PortalIcon";
import type { PortalSearchGroupBlock } from "@/hooks/usePortalSearch";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";

type Props = {
  groups: PortalSearchGroupBlock[];
  selectedIndex?: number;
  onSelect: (hit: PortalSearchHit) => void;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function PortalSearchResultsGrouped({
  groups,
  selectedIndex = -1,
  onSelect,
  loading,
  emptyLabel = "Keine Treffer",
  className,
}: Props) {
  const flat = groups.flatMap((g) => g.hits);
  if (!loading && flat.length === 0) {
    return (
      <p
        className={
          className
            ? `px-3 py-4 text-[13px] text-[var(--p2-faint,#8a938e)] ${className}`
            : "px-3 py-4 text-[13px] text-[var(--p2-faint,#8a938e)]"
        }
      >
        {emptyLabel}
      </p>
    );
  }

  let idx = -1;
  return (
    <div
      className={
        className
          ? `max-h-72 overflow-y-auto py-1 ${className}`
          : "max-h-72 overflow-y-auto py-1"
      }
      role="listbox"
    >
      {loading && flat.length === 0 ? (
        <p className="px-3 py-3 text-[13px] text-[var(--p2-faint,#8a938e)]">
          Suche…
        </p>
      ) : null}
      {groups.map((g) => (
        <div key={g.group} className="mb-1">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--p2-faint,#8a938e)]">
            {g.label}
          </div>
          {g.hits.map((h) => {
            idx += 1;
            const active = idx === selectedIndex;
            return (
              <PortalButton
                key={h.id}
                type="button"
                variant="ghost"
                role="option"
                aria-selected={active}
                className={
                  active
                    ? "flex w-full items-center gap-2 rounded-none px-3 py-2 text-left bg-[var(--p2-soft,#eef3ef)]"
                    : "flex w-full items-center gap-2 rounded-none px-3 py-2 text-left hover:bg-[var(--p2-soft,#eef3ef)]"
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(h);
                }}
              >
                <PortalIcon
                  n={h.icon as "search"}
                  ctx="muted"
                  className="h-4 w-4 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--p2-ink,#142019)]">
                    {h.label}
                  </span>
                  {h.sub ? (
                    <span className="block truncate text-[12px] text-[var(--p2-faint,#8a938e)]">
                      {h.sub}
                    </span>
                  ) : null}
                </span>
              </PortalButton>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function flattenPortalSearchGroups(
  groups: PortalSearchGroupBlock[]
): PortalSearchHit[] {
  return groups.flatMap((g) => g.hits);
}
