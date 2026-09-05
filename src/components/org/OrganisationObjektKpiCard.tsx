"use client";

import type { ObjektKpiPortal } from "@/lib/org/objektakte/types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

type Props = {
  kpis: ObjektKpiPortal;
  /** @deprecated ungenutzt */
  jahr?: number;
  onHistorieClick?: () => void;
  onBerichtClick?: () => void;
};

function fmtEuro(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("de-DE")} €`;
}

export function OrganisationObjektKpiCard({
  kpis,
  onHistorieClick,
  onBerichtClick,
}: Props) {
  const tiles = [
    {
      id: "vorgaenge",
      label: "Vorgänge gesamt",
      value: kpis.vorgaengeGesamt,
      onClick: onHistorieClick,
    },
    {
      id: "offen",
      label: "Offen / in Arbeit",
      value: kpis.offenInArbeit,
    },
    {
      id: "kosten",
      label: "Gesamtkosten",
      value: fmtEuro(kpis.kostenLaufendesJahr),
    },
    {
      id: "anlagen",
      label: "Anlagen",
      value: kpis.anlagenAnzahl,
    },
  ];

  return (
    <div
      className="space-y-3 rounded-[12px] border bg-white p-4"
      style={{ borderColor: PORTAL_VAR.line }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="portal-text-section">Kennzahlen</p>
        </div>
        {onBerichtClick ? (
          <button
            type="button"
            onClick={onBerichtClick}
            className="btn-pill-primary portal-btn text-[13px]"
          >
            Bericht erstellen
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((tile) => {
          const inner = (
            <>
              <p className="portal-text-title leading-none">{tile.value}</p>
              <p className="portal-text-label mt-1.5 normal-case tracking-normal">
                {tile.label}
              </p>
            </>
          );
          const style = {
            background: "#fff",
            border: `0.5px solid ${PORTAL_VAR.line}`,
            borderRadius: 12,
            padding: "14px 14px",
            textAlign: "left" as const,
          };
          if (tile.onClick) {
            return (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                style={style}
                className="transition hover:border-primary/30"
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
    </div>
  );
}
