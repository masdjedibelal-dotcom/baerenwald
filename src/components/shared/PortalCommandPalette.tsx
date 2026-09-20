"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PortalButton } from "@/components/portal/PortalButton";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PortalInput } from "@/components/shared/PortalFormControls";
import {
  PortalSearchResultsGrouped,
  flattenPortalSearchGroups,
} from "@/components/shared/PortalSearchResultsGrouped";
import { usePortalSearch } from "@/hooks/usePortalSearch";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";

type Props = {
  open: boolean;
  onClose: () => void;
  apiPath: string;
  navHits?: PortalSearchHit[];
  /** Fallback wenn Enter ohne Treffer */
  listFallbackHref?: string;
};

/** ⌘K — gleiche Gruppen/UI wie Header-Suche (HV + Partner). */
export function PortalCommandPalette({
  open,
  onClose,
  apiPath,
  navHits,
  listFallbackHref = "/portal?section=vorgaenge",
}: Props) {
  const router = useRouter();
  const [sel, setSel] = useState(0);
  const defaultNav = useMemo<PortalSearchHit[]>(
    () =>
      navHits ?? [
        {
          id: "nav-home",
          group: "navigation",
          icon: "layout-dashboard",
          label: "Übersicht",
          sub: "Navigation",
          href: listFallbackHref.includes("/partner")
            ? "/partner"
            : "/portal",
        },
        {
          id: "nav-liste",
          group: "navigation",
          icon: "list",
          label: "Vorgänge",
          sub: "Navigation",
          href: listFallbackHref,
        },
      ],
    [navHits, listFallbackHref]
  );

  const { q, setQ, groups, hits, loading, recent, addRecent } = usePortalSearch(
    {
      apiPath,
      minChars: 1,
      debounceMs: 180,
      includeNav: true,
      navHits: defaultNav,
      maxHits: 12,
    }
  );

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
  }, [open, setQ]);

  useEffect(() => {
    setSel(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, Math.max(0, hits.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const c = hits[sel];
        if (c) {
          addRecent(q);
          onClose();
          router.push(c.href);
        } else if (q.trim()) {
          addRecent(q);
          onClose();
          const sep = listFallbackHref.includes("?") ? "&" : "?";
          router.push(
            `${listFallbackHref}${sep}q=${encodeURIComponent(q.trim())}`
          );
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, hits, sel, q, onClose, router, addRecent, listFallbackHref]);

  if (!open) return null;

  const flat = flattenPortalSearchGroups(groups);

  return (
    <div
      className="portal-cmdk-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("portal-cmdk-overlay"))
          onClose();
      }}
      role="presentation"
    >
      <div
        className="portal-cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Suche"
      >
        <div className="portal-cmdk-input">
          <PortalIcon n="search" ctx="default" className="h-[18px] w-[18px]" />
          <PortalInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Name, Titel, Adresse…"
            autoFocus
            className="portal-cmdk-field"
          />
          <kbd className="portal-cmdk-kbd">ESC</kbd>
        </div>
        <div className="portal-cmdk-list">
          {q.trim() ? (
            <PortalSearchResultsGrouped
              groups={groups}
              selectedIndex={sel}
              loading={loading}
              emptyLabel={`Keine Treffer für „${q}“`}
              onSelect={(c) => {
                addRecent(q);
                onClose();
                router.push(c.href);
              }}
            />
          ) : recent.length ? (
            <>
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--p2-faint,#8a938e)]">
                Letzte Suchen
              </div>
              {recent.map((r) => (
                <PortalButton
                  key={r}
                  variant="ghost"
                  type="button"
                  className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-left"
                  onClick={() => setQ(r)}
                >
                  <PortalIcon n="search" ctx="muted" className="h-4 w-4" />
                  <span className="flex-1 truncate">{r}</span>
                </PortalButton>
              ))}
            </>
          ) : (
            <p className="px-3 py-4 text-[13px] text-[var(--p2-faint,#8a938e)]">
              Tippe, um zu suchen
            </p>
          )}
        </div>
        {flat.length > 0 ? (
          <p className="sr-only">{flat.length} Treffer</p>
        ) : null}
      </div>
    </div>
  );
}
