"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PORTAL_DETAIL_SECTION_LABELS,
  type PortalDetailSectionId,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

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
      className={cn(
        "sticky top-0 z-20 -mx-4 bg-white/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6",
        "border-b lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none",
        className
      )}
      style={{ borderColor: PORTAL_VAR.line2 }}
    >
      <div
        className={cn(
          "flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden",
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
              aria-controls={mode === "tabs" ? `vorgang-panel-${item.id}` : undefined}
              onClick={() => select(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                on
                  ? "bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))]"
                  : "bg-[var(--p2-selected,#f0f2f0)]"
              )}
              style={{
                color: on ? PORTAL_VAR.primary : PORTAL_VAR.sub,
              }}
            >
              {label}
              {item.badge && item.badge > 0 ? (
                <span
                  className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{
                    background: PORTAL_VAR.dangerSoft,
                    color: PORTAL_VAR.danger,
                  }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ul
        className="hidden flex-col gap-0.5 lg:flex lg:min-w-[9.5rem]"
        role={mode === "tabs" ? "tablist" : undefined}
      >
        {visible.map((item) => {
          const on = active === item.id;
          const label =
            item.label ?? PORTAL_DETAIL_SECTION_LABELS[item.id] ?? item.id;
          return (
            <li key={item.id} role={mode === "tabs" ? "presentation" : undefined}>
              <button
                type="button"
                role={mode === "tabs" ? "tab" : undefined}
                aria-selected={mode === "tabs" ? on : undefined}
                aria-controls={mode === "tabs" ? `vorgang-panel-${item.id}` : undefined}
                onClick={() => select(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors",
                  on
                    ? "bg-[var(--org-primary-soft,var(--p2-primary-soft,#E7F1E9))]"
                    : "hover:bg-[var(--p2-hover)]"
                )}
                style={{
                  color: on ? PORTAL_VAR.primary : PORTAL_VAR.sub,
                }}
              >
                <span>{label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    style={{
                      background: PORTAL_VAR.dangerSoft,
                      color: PORTAL_VAR.danger,
                    }}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
