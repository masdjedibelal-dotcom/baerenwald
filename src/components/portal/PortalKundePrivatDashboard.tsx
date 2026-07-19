"use client";

import {
  GEWERBE_DASHBOARD_ROLE_LABEL,
  PRIVAT_DASHBOARD_EMPTY_RECENT,
  PRIVAT_DASHBOARD_KPI_DEFS,
  PRIVAT_DASHBOARD_RECENT_ALL,
  PRIVAT_DASHBOARD_RECENT_TITLE,
  PRIVAT_DASHBOARD_ROLE_LABEL,
  type PrivatDashboardKpiId,
} from "@/lib/portal2/kunde-dashboard";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";

export type PrivatDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
};

type Props = {
  hello: string;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
  /** D8: z. B. „Eigentümer“ statt Privatkunde/Gewerbe */
  roleLabel?: string;
  kpis: Record<PrivatDashboardKpiId, number>;
  recent: PrivatDashboardRecentItem[];
  onOpenAll: () => void;
  onOpenItem: (id: string) => void;
};

/**
 * Mock `screenDashboard` Privat/Gewerbe — Hero, Offen/In Arbeit/Gesamt offen, Zuletzt.
 */
export function PortalKundePrivatDashboard({
  hello,
  kundeTyp,
  roleLabel: roleLabelProp,
  kpis,
  recent,
  onOpenAll,
  onOpenItem,
}: Props) {
  const roleLabel =
    roleLabelProp?.trim() ||
    (kundeTyp === "gewerbe"
      ? GEWERBE_DASHBOARD_ROLE_LABEL
      : PRIVAT_DASHBOARD_ROLE_LABEL);

  return (
    <div className="space-y-0">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ height: 180 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 55%, #0f766e 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,32,24,.12) 0%, rgba(16,32,24,.30) 55%, rgba(16,32,24,.70) 100%)",
          }}
        />
        <div className="absolute bottom-4 left-5 right-4 pointer-events-none">
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "rgba(255,255,255,.82)" }}
          >
            {roleLabel}
          </p>
          <h1 className="text-[28px] font-bold leading-tight text-white">
            {hello}
          </h1>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
        {PRIVAT_DASHBOARD_KPI_DEFS.map((def) => (
          <div
            key={def.id}
            className="rounded-[14px] border border-border-default bg-white p-3 shadow-sm sm:p-4"
          >
            <p
              className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none text-text-primary sm:text-[30px]"
            >
              {kpis[def.id]}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-text-tertiary sm:text-xs">
              {def.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary">
            {PRIVAT_DASHBOARD_RECENT_TITLE}
          </p>
          <button
            type="button"
            className="text-[12.5px] font-semibold text-accent"
            onClick={onOpenAll}
          >
            {PRIVAT_DASHBOARD_RECENT_ALL}
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border-default bg-white">
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-text-tertiary">
              {PRIVAT_DASHBOARD_EMPTY_RECENT}
            </p>
          ) : (
            recent.map((v) => {
              const st = PORTAL_STATUS[v.flowStatus];
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onOpenItem(v.id)}
                  className="flex w-full items-center gap-2.5 border-b border-border-default px-4 py-3.5 text-left last:border-b-0 hover:bg-muted/40"
                >
                  {v.notfall ? <span className="text-[13px]">⚡</span> : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
                      {v.titel}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {v.objekt}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
