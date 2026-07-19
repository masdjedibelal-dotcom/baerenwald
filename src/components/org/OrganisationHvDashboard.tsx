"use client";

import {
  HV_DASHBOARD_EMPTY_RECENT,
  HV_DASHBOARD_KPI_DEFS,
  HV_DASHBOARD_RECENT_ALL,
  HV_DASHBOARD_RECENT_TITLE,
  HV_DASHBOARD_ROLE_LABEL,
  type HvDashboardKpiValues,
} from "@/lib/portal2/hv-dashboard";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";
import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";

export type HvDashboardRecentItem = {
  id: string;
  titel: string;
  objekt: string;
  flowStatus: PortalMockStatusId;
  notfall?: boolean;
};

type Props = {
  orgName: string;
  kpis: HvDashboardKpiValues;
  recent: HvDashboardRecentItem[];
  onOpenFilter: (filter: OrgVorgangFilter) => void;
  onOpenItem: (id: string) => void;
  heroImageUrl?: string | null;
};

/**
 * Mock `screenDashboard` für Kunde-HV — Hero, 3 KPI-Tiles, Zuletzt.
 */
export function OrganisationHvDashboard({
  orgName,
  kpis,
  recent,
  onOpenFilter,
  onOpenItem,
  heroImageUrl,
}: Props) {
  return (
    <div className="space-y-0">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ height: 180 }}
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
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,32,24,.12) 0%, rgba(16,32,24,.30) 55%, rgba(16,32,24,.70) 100%)",
          }}
        />
        <div className="absolute left-5 bottom-4 right-4 pointer-events-none">
          <p
            className="text-[11px] font-bold uppercase tracking-wide mb-1"
            style={{ color: "rgba(255,255,255,.82)" }}
          >
            {HV_DASHBOARD_ROLE_LABEL}
          </p>
          <h1
            className="text-[28px] font-bold text-white leading-tight"
            style={{
              fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
              textShadow: "0 1px 6px rgba(0,0,0,.25)",
            }}
          >
            {orgName}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4">
        {HV_DASHBOARD_KPI_DEFS.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => onOpenFilter(def.filter)}
            className="rounded-[14px] bg-white text-left p-4 transition-shadow hover:shadow-md"
            style={{
              border: `0.5px solid ${PORTAL_C.line}`,
              boxShadow: PORTAL_C.shadow,
            }}
          >
            <p
              className="text-[28px] font-bold leading-none"
              style={{
                color: PORTAL_C.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
              }}
            >
              {kpis[def.id]}
            </p>
            <p
              className="mt-1.5 text-xs font-semibold"
              style={{ color: PORTAL_C.faint }}
            >
              {def.label}
            </p>
          </button>
        ))}
      </div>

      <div className="pt-5 pb-2">
        <div className="mb-2.5 flex items-center justify-between">
          <h2
            className="text-[15px] font-bold"
            style={{
              color: PORTAL_C.ink,
              fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
            }}
          >
            {HV_DASHBOARD_RECENT_TITLE}
          </h2>
          <button
            type="button"
            onClick={() => onOpenFilter("aktiv")}
            className="text-[12.5px] font-semibold"
            style={{ color: "var(--org-primary, " + PORTAL_C.primary + ")" }}
          >
            {HV_DASHBOARD_RECENT_ALL}
          </button>
        </div>
        <div
          className="overflow-hidden rounded-xl bg-white"
          style={{ border: `1px solid ${PORTAL_C.line}` }}
        >
          {recent.length === 0 ? (
            <p
              className="py-8 text-center text-[13px]"
              style={{ color: PORTAL_C.faint }}
            >
              {HV_DASHBOARD_EMPTY_RECENT}
            </p>
          ) : (
            recent.map((v) => {
              const st = PORTAL_STATUS[v.flowStatus];
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onOpenItem(v.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-[#f7f8fa]"
                  style={{ borderBottom: `1px solid ${PORTAL_C.line2}` }}
                >
                  {v.notfall ? <span className="text-[13px]">⚡</span> : null}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{
                        color: PORTAL_C.ink,
                        fontFamily:
                          "var(--p2-font-head, " + PORTAL_C.head + ")",
                      }}
                    >
                      {v.titel}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: PORTAL_C.sub }}
                    >
                      {v.objekt}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
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
