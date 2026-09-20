"use client";

import { useEffect, useState } from "react";

import { PortalCommandPalette } from "@/components/shared/PortalCommandPalette";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";

type Props = {
  apiPath: string;
  navHits?: PortalSearchHit[];
  listFallbackHref?: string;
};

/** ⌘K / Ctrl+K öffnet Command-Palette (nur HV + Partner verdrahten). */
export function PortalGlobalShortcuts({
  apiPath,
  navHits,
  listFallbackHref,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          t?.isContentEditable
        ) {
          /* erlaubt — Palette ersetzt Fokus */
        }
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PortalCommandPalette
      open={open}
      onClose={() => setOpen(false)}
      apiPath={apiPath}
      navHits={navHits}
      listFallbackHref={listFallbackHref}
    />
  );
}
