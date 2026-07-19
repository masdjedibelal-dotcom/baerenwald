"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  EINSTELLUNGEN_PAGE_EYEBROW,
  einstellungenDefaultTab,
  einstellungenNavFor,
  einstellungenNavStorageKey,
  type EinstellungenTabId,
} from "@/lib/portal2/einstellungen-nav";
import type { EinstellungenVariant } from "@/lib/portal2/einstellungen";
import { einstellungenPageTitle } from "@/lib/portal2/einstellungen";
import { usePortalView } from "@/hooks/use-portal-view";
import { isPortalMobileView } from "@/lib/portal2/viewport";
import { PORTAL_C } from "@/lib/portal2/tokens";
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

  const [tab, setTab] = useState<EinstellungenTabId>(() =>
    einstellungenDefaultTab(variant)
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(einstellungenNavStorageKey(variant));
      if (raw && nav.some((n) => n.id === raw)) {
        setTab(raw as EinstellungenTabId);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur Variant-Wechsel
  }, [variant]);

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
        <p
          className="mb-1 text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: PORTAL_C.faint }}
        >
          {eye}
        </p>
        <h1
          className="text-[25px] font-bold"
          style={{
            color: PORTAL_C.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
          }}
        >
          {einstellungenPageTitle(variant)}
        </h1>
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
                    className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                    style={{
                      border: `1px solid ${on ? "transparent" : PORTAL_C.line}`,
                      background: on ? PORTAL_C.greenDark : "#fff",
                      color: on ? "#fff" : PORTAL_C.sub,
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
                        className="w-full rounded-[9px] px-3 py-2.5 text-left text-[13px] font-semibold transition-colors"
                        style={{
                          background: on
                            ? "var(--org-primary-soft, " +
                              PORTAL_C.primarySoft +
                              ")"
                            : "transparent",
                          color: on ? PORTAL_C.ink : PORTAL_C.sub,
                          boxShadow: on
                            ? "inset 3px 0 0 var(--org-primary, " +
                              PORTAL_C.primary +
                              ")"
                            : "none",
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
          <div
            className="rounded-xl bg-white p-4 sm:p-5"
            style={{ border: `1px solid ${PORTAL_C.line}` }}
          >
            {children(tab)}
          </div>
        </div>
      </div>
    </div>
  );
}
