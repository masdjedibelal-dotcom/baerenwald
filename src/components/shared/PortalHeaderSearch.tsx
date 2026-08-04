"use client";

import { Search } from "lucide-react";

type Props = {
  placeholder?: string;
  /** Optional: bei Enter / Submit (z. B. zur Liste springen). */
  onSubmit?: (query: string) => void;
  className?: string;
};

/**
 * Kompakte Header-Suche (Privat / Eigentümer / Partner).
 * Visuell wie OrganisationSuche — ohne Org-API.
 */
export function PortalHeaderSearch({
  placeholder = "Suchen…",
  onSubmit,
  className,
}: Props) {
  return (
    <div className={className ? `portal-search ${className}` : "portal-search"}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden
      />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="portal-search-input"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const v = (e.target as HTMLInputElement).value.trim();
          if (v) onSubmit?.(v);
        }}
      />
    </div>
  );
}
