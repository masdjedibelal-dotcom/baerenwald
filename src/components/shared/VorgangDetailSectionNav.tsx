"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PORTAL_DETAIL_SECTION_LABELS,
  type PortalDetailSectionId,
} from "@/lib/portal2/layout-chrome";
import { cn } from "@/lib/utils";
import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";

export type VorgangDetailNavItem = {
  id: PortalDetailSectionId;
  label?: string;
  /** Badge z. B. ungelesene BT-Einträge */
  badge?: number | null;
  hidden?: boolean;
};

type Props = {
  items: VorgangDetailNavItem[];
  className?: string;
  /** Mobile: Accordion-ähnliche Chips (Default) */
  mobileMode?: "chips" | "accordion";
  /**
   * `tabs` = nur aktiver Abschnitt (Parent show/hide) — kein Scroll/Anker.
   * `anchors` = Legacy Scroll zu Section-IDs (vermeiden).
   */
  mode?: "tabs" | "anchors";
  /** Controlled active section (tabs). */
  activeId?: string;
  onActiveChange?: (id: string) => void;
};

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setHash(id: string) {
  try {
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* ignore */
  }
}

function clearHash() {
  try {
    const url = new URL(window.location.href);
    if (!url.hash) return;
    url.hash = "";
    const next = `${url.pathname}${url.search}`;
    window.history.replaceState(null, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * C2 — Detail Section-Nav (Details, Angebot, Bautagebuch, Dokumente, …).
 * Default: Tab-Switch ohne Anker-Scroll.
 */
export function VorgangDetailSectionNav({
  items,
  className,
  mobileMode = "chips",
  mode = "tabs",
  activeId: activeIdProp,
  onActiveChange,
}: Props) {
  const visible = useMemo(
    () => items.filter((i) => !i.hidden),
    [items]
  );
  const [internalActive, setInternalActive] = useState<string>(
    visible[0]?.id ?? "uebersicht"
  );

  const controlled = activeIdProp !== undefined;
  const active = controlled ? activeIdProp : internalActive;

  const select = useCallback(
    (id: string) => {
      if (!controlled) setInternalActive(id);
      onActiveChange?.(id);
      if (mode === "anchors") {
        setHash(id);
        scrollToSection(id);
      } else {
        // Tabs: Hash nur für Deep-Link-Einlesen — danach entfernen,
        // damit der Browser nicht zu #id scrollt.
        clearHash();
      }
    },
    [controlled, mode, onActiveChange]
  );

  /** Deep-Link #bautagebuch → einmalig Tab wählen, ohne Scroll-Anker. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash) return;
    if (!visible.some((v) => v.id === hash)) return;
    if (!controlled) setInternalActive(hash);
    onActiveChange?.(hash);
    if (mode === "anchors") {
      requestAnimationFrame(() => scrollToSection(hash));
    } else {
      clearHash();
    }
    // nur initial / wenn sichtbare Tabs wechseln
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Deep-Link einmalig
  }, [visible.map((v) => v.id).join("|")]);

  useEffect(() => {
    if (!visible.some((v) => v.id === active) && visible[0]) {
      if (!controlled) setInternalActive(visible[0].id);
      onActiveChange?.(visible[0].id);
    }
  }, [visible, active, controlled, onActiveChange]);

  useEffect(() => {
    if (mode !== "anchors") return;
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit?.target?.id) {
          if (!controlled) setInternalActive(hit.target.id);
          onActiveChange?.(hit.target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] }
    );
    for (const item of visible) {
      const el = document.getElementById(item.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [visible, mode, controlled, onActiveChange]);

  if (visible.length < 2) return null;

  return (
    <nav
      aria-label="Vorgang-Abschnitte"
      className={cn("portal-detail-tabs-nav", className)}
    >
      <div
        className={cn(
          "portal-detail-tabs-row",
          mobileMode === "accordion" && "flex-wrap"
        )}
        role={mode === "tabs" ? "tablist" : undefined}
      >
        {visible.map((item) => {
          const on = active === item.id;
          const label =
            item.label ?? PORTAL_DETAIL_SECTION_LABELS[item.id] ?? item.id;
          return (
            <button
              key={item.id}
              type="button"
              role={mode === "tabs" ? "tab" : undefined}
              aria-selected={mode === "tabs" ? on : undefined}
              aria-controls={
                mode === "tabs" ? `vorgang-panel-${item.id}` : undefined
              }
              onClick={() => select(item.id)}
              className={cn(
                "portal-detail-tab",
                on && "portal-detail-tab--active"
              )}
            >
              {label}
              <PortalCountBadge count={item.badge ?? 0} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
