"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PortalSearchGroupId,
  PortalSearchHit,
} from "@/lib/search/portal-search-types";
import { PORTAL_SEARCH_GROUP_LABELS } from "@/lib/search/portal-search-types";

const RECENT_KEY = "bw-portal-recent-search";

export type UsePortalSearchOptions = {
  minChars?: number;
  debounceMs?: number;
  includeNav?: boolean;
  navHits?: PortalSearchHit[];
  apiPath: string;
  maxHits?: number;
};

export type PortalSearchGroupBlock = {
  group: PortalSearchGroupId;
  label: string;
  hits: PortalSearchHit[];
};

export function usePortalSearch(opts: UsePortalSearchOptions) {
  const {
    minChars = 2,
    debounceMs = 220,
    includeNav = false,
    navHits = [],
    apiPath,
    maxHits = 14,
  } = opts;

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PortalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const addRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecent((r) => {
      const next = [t, ...r.filter((x) => x !== t)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < minChars) {
      setHits([]);
      setLoading(false);
      return;
    }

    const navFiltered = includeNav
      ? navHits.filter(
          (h) =>
            h.label.toLowerCase().includes(needle.toLowerCase()) ||
            h.sub?.toLowerCase().includes(needle.toLowerCase())
        )
      : [];

    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(() => {
      fetch(`${apiPath}?q=${encodeURIComponent(needle)}`, {
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((data: { hits?: PortalSearchHit[] }) => {
          const entity = (data.hits ?? []).map((h) => ({
            ...h,
            group: h.group ?? ("vorgaenge" as PortalSearchGroupId),
          }));
          setHits([...navFiltered, ...entity].slice(0, maxHits));
        })
        .catch(() => setHits(navFiltered))
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [q, minChars, debounceMs, includeNav, navHits, apiPath, maxHits]);

  const groups: PortalSearchGroupBlock[] = useMemo(() => {
    const order: PortalSearchGroupId[] = [
      "navigation",
      "vorgaenge",
      "objekte",
      "dokumente",
    ];
    const map = new Map<PortalSearchGroupId, PortalSearchHit[]>();
    for (const h of hits) {
      const g = h.group;
      const arr = map.get(g) ?? [];
      arr.push(h);
      map.set(g, arr);
    }
    return order
      .filter((g) => (map.get(g)?.length ?? 0) > 0)
      .map((g) => ({
        group: g,
        label: PORTAL_SEARCH_GROUP_LABELS[g],
        hits: map.get(g) ?? [],
      }));
  }, [hits]);

  return {
    q,
    setQ,
    hits,
    groups,
    loading,
    recent,
    addRecent,
    clearHits: () => setHits([]),
  };
}
