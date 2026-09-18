"use client";

type PortalListPaginationProps = {
  totalItems: number;
  itemLabel: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Sichtbare Treffer auf der Seite (Deep Green: „X von Y Vorgängen“) */
  visibleCount?: number;
};

export function PortalListPagination({
  totalItems,
  itemLabel,
  currentPage,
  totalPages,
  onPageChange,
  visibleCount,
}: PortalListPaginationProps) {
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const shown = visibleCount ?? totalItems;

  return (
    <div className="portal-list-pagination">
      <p className="portal-list-pagination-count">
        {shown} von {totalItems} {itemLabel}
        {totalPages > 1 ? (
          <span className="portal-list-pagination-pages">
            {" "}
            · Seite {safePage} / {totalPages}
          </span>
        ) : null}
      </p>
      {totalPages > 1 ? (
        <div className="portal-list-pagination-nav">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label="Vorherige Seite"
          >
            ←
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            aria-label="Nächste Seite"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const PORTAL_LIST_PAGE_SIZE = 10;

/** Übersicht (Startseite): maximal 4 Karten pro Tab. */
export const PORTAL_OVERVIEW_PAGE_SIZE = 4;
