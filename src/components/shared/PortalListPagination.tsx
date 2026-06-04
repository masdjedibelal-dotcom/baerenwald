"use client";

type PortalListPaginationProps = {
  totalItems: number;
  itemLabel: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function PortalListPagination({
  totalItems,
  itemLabel,
  currentPage,
  totalPages,
  onPageChange,
}: PortalListPaginationProps) {
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-light px-3 py-3 sm:px-4">
      <p className="portal-text-meta text-text-secondary">
        <span className="font-medium text-text-primary">{totalItems}</span>{" "}
        {itemLabel}
        {totalPages > 1 ? (
          <span className="text-text-tertiary">
            {" "}
            · Seite {safePage} / {totalPages}
          </span>
        ) : null}
      </p>
      <div className="portal-text-meta inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-card px-2 py-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="portal-touch-target grid place-items-center rounded-full text-text-secondary transition hover:bg-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Vorherige Seite"
        >
          <span aria-hidden>←</span>
        </button>
        <span className="min-w-[84px] text-center font-medium text-text-secondary">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="portal-touch-target grid place-items-center rounded-full text-text-secondary transition hover:bg-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Nächste Seite"
        >
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

export const PORTAL_LIST_PAGE_SIZE = 10;
