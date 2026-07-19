"use client";

import type { ReactNode } from "react";

import { usePortalView } from "@/hooks/use-portal-view";
import { isPortalMobileView } from "@/lib/portal2/viewport";
import { PORTAL_C } from "@/lib/portal2/tokens";

export type PortalDashboardTile = {
  id: string;
  label: string;
  value: number;
  onClick?: () => void;
};

export type PortalDashboardRecentRow = {
  id: string;
  titel: string;
  objekt: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  notfall?: boolean;
};

type Props = {
  roleLabel: string;
  hello: string;
  heroImageUrl?: string | null;
  tiles: PortalDashboardTile[];
  recent: PortalDashboardRecentRow[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  recentTitle?: string;
  recentAllLabel?: string;
  recentEmpty?: string;
  /** Optional content strictly below mock body (avoid on start if possible). */
  after?: ReactNode;
};

/**
 * Mock `screenDashboard` 1:1 — Hero, 3 KPI-Tiles, „Zuletzt“.
 */
export function PortalScreenDashboard({
  roleLabel,
  hello,
  heroImageUrl,
  tiles,
  recent,
  onOpenAll,
  onOpenItem,
  recentTitle = "Zuletzt",
  recentAllLabel = "Alle ansehen",
  recentEmpty = "Noch nichts",
  after,
}: Props) {
  const view = usePortalView();
  const mobile = isPortalMobileView(view);

  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-5">
      {/* Hero — Mock height 150/200, overlay, role + hello */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: mobile ? 150 : 200 }}
      >
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 55%, #0f766e 100%)",
            }}
            aria-hidden
          />
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,32,24,.12) 0%, rgba(16,32,24,.30) 55%, rgba(16,32,24,.70) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-4"
          style={{
            left: mobile ? 16 : 24,
            bottom: mobile ? 14 : 18,
          }}
        >
          <p
            className="mb-1 font-bold uppercase"
            style={{
              fontSize: mobile ? 10.5 : 11.5,
              color: "rgba(255,255,255,.82)",
              letterSpacing: 0.5,
            }}
          >
            {roleLabel}
          </p>
          <h1
            className="font-bold text-white"
            style={{
              fontFamily: PORTAL_C.head,
              fontSize: mobile ? 23 : 30,
              lineHeight: 1.05,
              textShadow: "0 1px 6px rgba(0,0,0,.25)",
            }}
          >
            {hello}
          </h1>
        </div>
      </div>

      {/* KPI-Tiles — Mock: weiß, ink-Zahl, faint-Label */}
      <div
        className="grid grid-cols-3"
        style={{
          gap: mobile ? 9 : 12,
          padding: mobile ? "14px 16px" : "16px 24px",
        }}
      >
        {tiles.map((tile) => {
          const inner = (
            <>
              <p
                className="font-bold leading-none"
                style={{
                  fontFamily: PORTAL_C.head,
                  fontSize: mobile ? 24 : 30,
                  color: PORTAL_C.ink,
                }}
              >
                {tile.value}
              </p>
              <p
                className="font-semibold"
                style={{
                  fontSize: mobile ? 11 : 12,
                  color: PORTAL_C.faint,
                  marginTop: 5,
                }}
              >
                {tile.label}
              </p>
            </>
          );
          const style = {
            background: "#fff",
            border: `0.5px solid ${PORTAL_C.line}`,
            boxShadow: PORTAL_C.shadow,
            borderRadius: 14,
            padding: mobile ? "13px 12px" : "16px 16px",
            textAlign: "left" as const,
          };
          if (tile.onClick) {
            return (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                style={style}
              >
                {inner}
              </button>
            );
          }
          return (
            <div key={tile.id} style={style}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Zuletzt */}
      <div
        style={{
          padding: mobile ? "8px 16px 24px" : "10px 24px 24px",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <h2
            className="font-bold"
            style={{
              fontFamily: PORTAL_C.head,
              fontSize: 15,
              color: PORTAL_C.ink,
            }}
          >
            {recentTitle}
          </h2>
          <button
            type="button"
            onClick={onOpenAll}
            className="font-semibold"
            style={{
              fontSize: 12.5,
              color: "var(--org-primary, " + PORTAL_C.primary + ")",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            {recentAllLabel}
          </button>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${PORTAL_C.line}`,
            overflow: "hidden",
          }}
        >
          {recent.length === 0 ? (
            <div
              style={{
                padding: 34,
                textAlign: "center",
                color: PORTAL_C.faint,
                fontSize: 13,
              }}
            >
              {recentEmpty}
            </div>
          ) : (
            recent.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpenItem(v.id)}
                className="flex w-full items-center text-left"
                style={{
                  gap: 10,
                  padding: "13px 15px",
                  borderBottom:
                    idx < recent.length - 1
                      ? `1px solid ${PORTAL_C.line2}`
                      : "none",
                  cursor: "pointer",
                  background: "transparent",
                }}
              >
                {v.notfall ? (
                  <span style={{ fontSize: 13 }}>⚡</span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-semibold"
                    style={{
                      fontSize: 14,
                      color: PORTAL_C.ink,
                      fontFamily: PORTAL_C.head,
                    }}
                  >
                    {v.titel}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: PORTAL_C.sub,
                      marginTop: 1,
                    }}
                  >
                    {v.objekt}
                  </p>
                </div>
                <span
                  className="shrink-0 whitespace-nowrap font-semibold"
                  style={{
                    fontSize: 11,
                    color: v.statusColor,
                    background: v.statusBg,
                    padding: "3px 9px",
                    borderRadius: 99,
                  }}
                >
                  {v.statusLabel}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {after}
    </div>
  );
}
