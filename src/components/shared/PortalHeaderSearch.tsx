"use client";

import { useEffect, useRef, useState } from "react";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { PortalSearchResultsGrouped } from "@/components/shared/PortalSearchResultsGrouped";
import { PortalInput } from "@/components/shared/PortalFormControls";
import { usePortalSearch } from "@/hooks/usePortalSearch";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";

type Props = {
  /** API-Pfad, z. B. `/api/org/suche` · `/api/partner/suche` · `/api/portal/suche` */
  apiPath: string;
  onSelect: (hit: PortalSearchHit) => void;
  /** Rolle nur für a11y / Placeholder-Kontext */
  role?: "hv" | "partner" | "kunde" | "eigentuemer" | "hausmeister";
  placeholder?: string;
  className?: string;
};

/**
 * Header-Suche mit Debounce + gruppierten Treffern (Portal-Tokens).
 * Eine Fetch-Logik über `usePortalSearch` — Guard zählt diesen Pfad.
 */
export function PortalHeaderSearch({
  apiPath,
  onSelect,
  role,
  placeholder = "Suchen…",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { q, setQ, groups, loading, addRecent, clearHits } = usePortalSearch({
    apiPath,
    minChars: 2,
    debounceMs: 220,
    maxHits: 12,
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const ariaRole =
    role === "hv"
      ? "Organisation suchen"
      : role === "partner"
        ? "Aufträge und Anfragen suchen"
        : "Vorgänge suchen";

  return (
    <div
      ref={wrapRef}
      className={className ? `portal-search relative ${className}` : "portal-search relative"}
    >
      <PortalIcon
        n="search"
        ctx="default"
        className="portal-search-icon"
        aria-hidden
      />
      <PortalInput
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (q.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            clearHits();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaRole}
        className="portal-search-input"
        autoComplete="off"
      />
      {open && q.trim().length >= 2 ? (
        <div className="portal-search-dropdown absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[12px] border border-[var(--p2-line,#dfe4e0)] bg-[var(--p2-surface,#fff)] shadow-[0_8px_24px_rgba(16,32,24,0.12)] sm:left-auto sm:right-0 sm:w-80">
          <PortalSearchResultsGrouped
            groups={groups}
            loading={loading}
            emptyLabel={`Keine Treffer für „${q.trim()}“`}
            onSelect={(hit) => {
              addRecent(q);
              setOpen(false);
              setQ("");
              clearHits();
              onSelect(hit);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
