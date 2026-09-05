"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { PortalDashboardActionCarousel } from "@/components/shared/PortalDashboardActionCarousel";
import { portalDayGreetingPhrase } from "@/lib/portal2/greeting";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import { cn } from "@/lib/utils";

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
  /** @deprecated Deep Green: Status nur als Wortfarbe */
  statusBg?: string;
  notfall?: boolean;
};

type Props = {
  roleLabel: string;
  /** Anzeigename (ohne „Hallo …“) */
  hello: string;
  heroImageUrl?: string | null;
  /** Marken-Kürzel mobil im Hero (Default: erster Buchstabe) */
  brandKuerzel?: string | null;
  /** Org-/Verwaltungsname unter dem Kürzel (Mobil-Hero) */
  brandSubline?: string | null;
  avatarName?: string | null;
  avatarInitials?: string | null;
  tiles: PortalDashboardTile[];
  /** @deprecated KPIs sitzen im Hero — ignoriert */
  tilesTitle?: string;
  /** Echte Aktionen — ersetzt die Mock-Fokus-Karte. */
  actionSlides?: PortalDashboardActionSlide[];
  onOpenActionItem?: (id: string, opts?: { focus?: string }) => void;
  onActionRefresh?: () => void | Promise<void>;
  /** Zwischen Fokus und Liste (z. B. Service-Versprechen HV) */
  afterFocus?: ReactNode;
  /** @deprecated Alias → afterFocus */
  afterTiles?: ReactNode;
  recent: PortalDashboardRecentRow[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
  recentTitle?: string;
  recentAllLabel?: string;
  recentEmpty?: string;
  /** @deprecated vor KPI — nicht mehr im Hero-Layout */
  beforeTiles?: ReactNode;
  after?: ReactNode;
};

/**
 * Deep Green Dashboard: Hero (Grün + KPIs) → Fokus → optional Strip → Liste.
 */
export function PortalScreenDashboard({
  roleLabel,
  hello,
  heroImageUrl,
  brandKuerzel,
  brandSubline,
  avatarName,
  tiles,
  actionSlides,
  onOpenActionItem,
  onActionRefresh,
  recent,
  onOpenAll,
  onOpenItem,
  recentTitle = "Zuletzt",
  recentAllLabel = "Alle ansehen",
  recentEmpty = "Noch keine Vorgänge — sie erscheinen hier, sobald etwas losgeht.",
  afterFocus,
  afterTiles,
  beforeTiles,
  after,
}: Props) {
  const greet = portalDayGreetingPhrase();
  const displayName = (avatarName?.trim() || hello).trim();
  const kuerzel = (
    brandKuerzel?.trim() ||
    displayName.charAt(0) ||
    "B"
  )
    .slice(0, 2)
    .toUpperCase();
  const strip = afterFocus ?? afterTiles;
  const mobileSub = brandSubline?.trim() || roleLabel;

  return (
    <div className="portal-dash">
      <section className="portal-dash-hero">
        <div
          className="portal-dash-hero-bg"
          style={
            heroImageUrl
              ? { backgroundImage: `url(${heroImageUrl})` }
              : undefined
          }
          aria-hidden
        />
        <div className="portal-dash-hero-scrim" aria-hidden />

        <div className="portal-dash-hero-mobile-bar lg:hidden">
          <div className="portal-dash-hero-brand">
            <div className="portal-dash-hero-mark" aria-hidden>
              {kuerzel}
            </div>
            <div className="portal-dash-hero-brand-text">
              <p className="portal-dash-hero-brand-role">{mobileSub}</p>
            </div>
          </div>
        </div>

        <div className="portal-dash-hero-inner">
          <div className="portal-dash-hero-copy">
            {roleLabel ? (
              <p className="portal-dash-hero-kicker">{roleLabel}</p>
            ) : null}
            <p className="portal-dash-hero-greet">{greet}</p>
            <h1 className="portal-dash-hero-name">{displayName}</h1>
          </div>

          <div className="portal-dash-hero-kpis">
            {tiles.map((tile, idx) => {
              const sand = idx === 0;
              const className = cn(
                "portal-dash-kpi",
                sand && "portal-dash-kpi--sand"
              );
              const inner = (
                <>
                  <p className="portal-dash-kpi-value">{tile.value}</p>
                  <p className="portal-dash-kpi-label">{tile.label}</p>
                </>
              );
              if (tile.onClick) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={tile.onClick}
                    className={className}
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <div key={tile.id} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="portal-dash-body">
        {beforeTiles ? (
          <div className="portal-dash-before">{beforeTiles}</div>
        ) : null}

        {actionSlides && actionSlides.length > 0 && onOpenActionItem && onActionRefresh ? (
          <PortalDashboardActionCarousel
            slides={actionSlides}
            onOpen={onOpenActionItem}
            onRefresh={onActionRefresh}
            className="portal-dash-focus--overlap"
          />
        ) : null}

        {strip ? <div className="portal-dash-strip">{strip}</div> : null}

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
                  <span className="portal-dash-recent-edge" aria-hidden />
                  <div className="portal-dash-recent-text">
                    <p className="portal-dash-recent-titel">{v.titel}</p>
                    <p className="portal-dash-recent-objekt">{v.objekt}</p>
                  </div>
                  <span
                    className="portal-dash-recent-status"
                    style={{ color: v.statusColor }}
                  >
                    {v.statusLabel}
                  </span>
                  <ChevronRight
                    className="portal-dash-recent-chevron"
                    aria-hidden
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {after}
      </div>
    </div>
  );
}
