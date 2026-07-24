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
};

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* ignore */
  }
}

/**
 * C2 — Detail Anchor-Nav (Übersicht, Angebot, Bautagebuch, Dokumente, Verlauf).
 * Desktop: sticky Side/Top-Chips · Mobile: Sub-Chips · Deep-Link #section.
 */
export function VorgangDetailSectionNav({
  items,
  className,
  mobileMode = "chips",
}: Props) {
  const visible = useMemo(
    () => items.filter((i) => !i.hidden),
    [items]
  );
  const [active, setActive] = useState<string>(visible[0]?.id ?? "uebersicht");
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  const applyHash = useCallback(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash) return;
    if (visible.some((v) => v.id === hash)) {
      setActive(hash);
      setMobileOpen(hash);
      // Nach Layout scrollen
      requestAnimationFrame(() => scrollToSection(hash));
    }
  }, [visible]);

  useEffect(() => {
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit?.target?.id) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] }
    );
    for (const item of visible) {
      const el = document.getElementById(item.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [visible]);

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
      {/* Mobile Sub-Chips */}
      <div
        className={cn(
          "flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden",
          mobileMode === "accordion" && "flex-wrap"
        )}
      >
        {visible.map((item) => {
          const on = active === item.id || mobileOpen === item.id;
          const label =
            item.label ?? PORTAL_DETAIL_SECTION_LABELS[item.id] ?? item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMobileOpen(item.id);
                setActive(item.id);
                scrollToSection(item.id);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                on ? "text-white" : "bg-[#f1f3f5]"
              )}
              style={
                on
                  ? {
                      background:
                        PORTAL_VAR.primary,
                    }
                  : { color: PORTAL_VAR.sub }
              }
            >
              {label}
              {item.badge && item.badge > 0 ? (
                <span
                  className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{
                    background: on
                      ? "rgba(255,255,255,0.25)"
                      : PORTAL_VAR.dangerSoft,
                    color: on ? "#fff" : PORTAL_VAR.danger,
                  }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Desktop Anchor-Menü */}
      <ul className="hidden flex-col gap-0.5 lg:flex lg:min-w-[9.5rem]">
        {visible.map((item) => {
          const on = active === item.id;
          const label =
            item.label ?? PORTAL_DETAIL_SECTION_LABELS[item.id] ?? item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setActive(item.id);
                  scrollToSection(item.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors",
                  on ? "bg-[var(--org-primary-soft,#E7F1E9)]" : "hover:bg-[var(--p2-hover)]"
                )}
                style={{
                  color: on
                    ? PORTAL_VAR.primary
                    : PORTAL_VAR.sub,
                }}
              >
                <span>{label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    style={{ background: PORTAL_VAR.dangerSoft, color: PORTAL_VAR.danger }}
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
