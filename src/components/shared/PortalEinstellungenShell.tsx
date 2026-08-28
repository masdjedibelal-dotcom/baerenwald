"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  EINSTELLUNGEN_PAGE_EYEBROW,
  einstellungenDefaultTab,
  einstellungenNavFor,
  einstellungenNavStorageKey,
  normalizeEinstellungenTabId,
  type EinstellungenTabId,
} from "@/lib/portal2/einstellungen-nav";
import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";
import { einstellungenPageTitle } from "@/lib/portal2/einstellungen";
import { usePortalView } from "@/hooks/use-portal-view";
import { isPortalMobileView } from "@/lib/portal2/viewport";
import {
  PortalListeEyebrow,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  variant: EinstellungenVariant;
  /** Override Eyebrow (z. B. Gewerbe). */
  eyebrow?: string;
  children: (tab: EinstellungenTabId) => ReactNode;
};

/**
 * Mock-Einstellungen-Chrome: pageHead + Subnav (Seite/Tabs) + aktive Fläche.
 */
export function PortalEinstellungenShell({
  variant,
  eyebrow,
  children,
}: Props) {
  const nav = einstellungenNavFor(variant);
  const view = usePortalView();
  const mobile = isPortalMobileView(view);
  const showNav = nav.length > 1;
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<EinstellungenTabId>(() =>
    einstellungenDefaultTab(variant)
  );

  useEffect(() => {
    const fromUrl = normalizeEinstellungenTabId(
      variant,
      searchParams.get("tab")
    );
    if (fromUrl) {
      setTab(fromUrl);
      try {
        sessionStorage.setItem(einstellungenNavStorageKey(variant), fromUrl);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(einstellungenNavStorageKey(variant));
      const mapped = normalizeEinstellungenTabId(variant, raw);
      if (mapped) setTab(mapped);
    } catch {
      /* ignore */
    }
  }, [variant, nav, searchParams]);

  const selectTab = (id: EinstellungenTabId) => {
    setTab(id);
    try {
      sessionStorage.setItem(einstellungenNavStorageKey(variant), id);
    } catch {
      /* ignore */
    }
  };

  const eye = eyebrow ?? EINSTELLUNGEN_PAGE_EYEBROW[variant];

  return (
    <div className="-mx-4 -mt-1 flex min-w-0 flex-col lg:-mx-6 lg:px-0">
      <div className="px-4 pb-1 lg:px-6">
        <PortalListeEyebrow>{eye}</PortalListeEyebrow>
        <PortalListeTitle>{einstellungenPageTitle(variant)}</PortalListeTitle>
      </div>

      <div
        className={cn(
          "mt-4 flex min-w-0 gap-0 px-4 lg:px-6",
          showNav && !mobile ? "flex-row gap-5" : "flex-col gap-3"
        )}
      >
        {showNav ? (
          mobile ? (
            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Einstellungen"
            >
              {nav.map((item) => {
                const on = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => selectTab(item.id)}
                    className="portal-text-meta shrink-0 rounded-full px-3.5 py-2 font-semibold"
                    style={{
                      border: `1px solid ${on ? "transparent" : PORTAL_VAR.line}`,
                      background: on ? PORTAL_VAR.greenDark : "#fff",
                      color: on ? "#fff" : PORTAL_VAR.sub,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <nav
              className="w-[200px] shrink-0"
              aria-label="Einstellungen"
            >
              <ul className="flex flex-col gap-0.5">
                {nav.map((item) => {
                  const on = tab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectTab(item.id)}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "portal-text-meta w-full rounded-[9px] px-3 py-2.5 text-left font-semibold transition-colors",
                          on
                            ? "bg-[var(--org-primary-soft,var(--p2-primary-soft,#E7F1E9))]"
                            : "hover:bg-[var(--p2-hover,#eef1ef)]"
                        )}
                        style={{
                          color: on ? PORTAL_VAR.primary : PORTAL_VAR.sub,
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )
        ) : null}

        <div className="min-w-0 flex-1">
          {/*
            Section-Stack: je Block eine portal-section-card (Geschwister auf Page-BG).
            Kein Outer-Card — siehe section-card-contract.ts.
          */}
          <div className="portal-einstellungen-stack max-w-[560px]">
            {children(tab)}
          </div>
        </div>
      </div>
    </div>
  );
}
