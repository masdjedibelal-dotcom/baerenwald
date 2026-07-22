"use client";

import type { ReactNode } from "react";

import { usePortalView } from "@/hooks/use-portal-view";
import { portalDayGreetingLabel } from "@/lib/portal2/greeting";
import { portalHeaderInitials } from "@/lib/portal2/role-badge";
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
  /** Anzeigename unter der Begrüßung (Mobil) / Hero-Titel (Desktop). */
  hello: string;
  heroImageUrl?: string | null;
  /** Avatar-Initialen; Default aus `hello`. */
  avatarName?: string | null;
  avatarInitials?: string | null;
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
 * Mock `screenDashboard` — mobil: Header-Bild + Kurve + Avatar + Begrüßung;
 * Desktop: klassischer Hero mit Overlay-Text.
 */
export function PortalScreenDashboard({
  roleLabel,
  hello,
  heroImageUrl,
  avatarName,
  avatarInitials,
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
  const greet = portalDayGreetingLabel();
  const profileLabel = (avatarName?.trim() || hello).trim();
  const initials =
    avatarInitials?.trim() ||
    portalHeaderInitials(profileLabel);

  if (mobile) {
    return (
      <div className="portal-dash -mx-4 -mt-5">
        <div className="portal-dash-hero-mobile">
          <div className="portal-dash-hero-media">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImageUrl} alt="" className="portal-dash-hero-img" />
            ) : (
              <div className="portal-dash-hero-fallback" aria-hidden />
            )}
          </div>

          <div className="portal-dash-curve">
            <svg
              className="portal-dash-curve-svg"
              viewBox="0 0 390 48"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 48 V28 C80 4 140 0 195 0 C250 0 310 4 390 28 V48 Z"
                fill="#fff"
              />
            </svg>

            <div className="portal-dash-curve-body">
              <div className="portal-dash-avatar" aria-hidden>
                {initials.slice(0, 2)}
              </div>
              <p className="portal-dash-greet">{greet}</p>
              <h1 className="portal-dash-name">{profileLabel}</h1>
            </div>
          </div>
        </div>

        <div className="portal-dash-tiles">
          {tiles.map((tile) => {
            const inner = (
              <>
                <p className="portal-dash-tile-value">{tile.value}</p>
                <p className="portal-dash-tile-label">{tile.label}</p>
              </>
            );
            if (tile.onClick) {
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={tile.onClick}
                  className="portal-dash-tile"
                >
                  {inner}
                </button>
              );
            }
            return (
              <div key={tile.id} className="portal-dash-tile">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="portal-dash-recent">
          <div className="portal-dash-recent-head">
            <h2 className="portal-dash-recent-title">{recentTitle}</h2>
            <button
              type="button"
              onClick={onOpenAll}
              className="portal-dash-recent-all"
            >
              {recentAllLabel}
            </button>
          </div>
          <div className="portal-dash-recent-list">
            {recent.length === 0 ? (
              <div className="portal-dash-recent-empty">{recentEmpty}</div>
            ) : (
              recent.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onOpenItem(v.id)}
                  className="portal-dash-recent-item"
                >
                  {v.notfall ? (
                    <span className="portal-dash-recent-bolt">⚡</span>
                  ) : null}
                  <div className="portal-dash-recent-text">
                    <p className="portal-dash-recent-titel">{v.titel}</p>
                    <p className="portal-dash-recent-objekt">{v.objekt}</p>
                  </div>
                  <span
                    className="portal-dash-recent-pill"
                    style={{ color: v.statusColor, background: v.statusBg }}
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

  return (
    <div className="-mx-4 -mt-5 lg:-mx-6 lg:-mt-7">
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
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
          className="pointer-events-none absolute bottom-[18px] left-6 right-4"
        >
          <p
            className="mb-1 font-bold uppercase"
            style={{
              fontSize: 11.5,
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
              fontSize: 30,
              lineHeight: 1.05,
              textShadow: "0 1px 6px rgba(0,0,0,.25)",
            }}
          >
            {hello}
          </h1>
        </div>
      </div>

      <div
        className="grid grid-cols-3"
        style={{ gap: 12, padding: "28px 24px 16px" }}
      >
        {tiles.map((tile) => {
          const inner = (
            <>
              <p
                className="font-bold leading-none"
                style={{
                  fontFamily: PORTAL_C.head,
                  fontSize: 30,
                  color: PORTAL_C.ink,
                }}
              >
                {tile.value}
              </p>
              <p
                className="font-semibold"
                style={{
                  fontSize: 12,
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
            padding: "16px 16px",
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

      <div style={{ padding: "10px 24px 24px" }}>
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
                {v.notfall ? <span style={{ fontSize: 13 }}>⚡</span> : null}
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
