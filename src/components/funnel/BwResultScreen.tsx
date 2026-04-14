"use client";

import { formatCurrencyEUR } from "@/lib/price-calc";
import type { BudgetCheck, FunnelState, PriceLineItem } from "@/lib/funnel/types";
import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface BwResultScreenProps {
  state: FunnelState;
  onBudgetChange?: (v: BudgetCheck) => void;
  className?: string;
}

function gewerkLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function gewerkSquareClass(g: string): string {
  const x = g.toLowerCase();
  if (x.includes("bad") || x.includes("küche") || x.includes("kueche"))
    return "bg-[#E6F1FB] text-[#0C447C]";
  if (x.includes("heizung") || x.includes("sanit"))
    return "bg-[#FDECEA] text-[#9C2B2B]";
  if (x.includes("garten") || x.includes("baum"))
    return "bg-[#EAF3DE] text-[#3B6D11]";
  if (x.includes("elektro")) return "bg-[#FDF3DC] text-[#854F0B]";
  return "bg-[#F0F4FF] text-[#185FA5]";
}

function BreakdownRow({ row }: { row: PriceLineItem }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-default px-3.5 py-2.5 last:border-b-0">
      <div className="flex min-w-0 gap-2">
        <div
          className={cn(
            "flex size-[26px] shrink-0 items-center justify-center rounded-md",
            gewerkSquareClass(row.gewerk)
          )}
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-primary">{row.gewerk}</p>
          <p className="text-[11px] text-text-secondary">{row.beschreibung}</p>
        </div>
      </div>
      <p className="shrink-0 text-[13px] font-medium tabular-nums text-text-primary">
        {formatCurrencyEUR(row.min)} – {formatCurrencyEUR(row.max)}
      </p>
    </div>
  );
}

export function BwResultScreen({
  state,
  onBudgetChange,
  className,
}: BwResultScreenProps) {
  const notfallAkut =
    state.situation === "notfall" && state.dringlichkeit === "akut";
  const tel = SITE_CONFIG.phone.replace(/\s/g, "");
  const budget = state.budgetCheck;

  if (notfallAkut) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="relative overflow-hidden rounded-[18px] bg-[#C0392B] p-5 text-center text-white">
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">
            Notfall
          </p>
          <p className="mt-3 text-lg font-semibold">Wir sind jetzt erreichbar</p>
          <a
            href={`tel:${tel}`}
            className="mt-2 block text-3xl font-extrabold tracking-tight"
          >
            {SITE_CONFIG.phone}
          </a>
          <a
            href={`tel:${tel}`}
            className="mt-5 inline-flex w-full max-w-xs justify-center rounded-full bg-surface-card px-6 py-3 text-sm font-semibold text-[#C0392B]"
          >
            Jetzt anrufen
          </a>
        </div>
      </div>
    );
  }

  const hasRange = state.priceMin > 0 && state.priceMax > 0;

  return (
    <div className={cn("space-y-5", className)}>
      {hasRange ? (
        <div className="relative overflow-hidden rounded-[18px] bg-surface-dark p-5 text-white">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#777]">
            Dein Preisrahmen
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-1">
            <span className="text-[38px] font-extrabold leading-none tracking-tight">
              {formatCurrencyEUR(state.priceMin)}
            </span>
            <span className="text-lg text-[#555]">–</span>
            <span className="text-[38px] font-extrabold leading-none tracking-tight">
              {formatCurrencyEUR(state.priceMax)}
            </span>
            <span className="text-sm text-[#777]">€</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#666]">
            Richtwert für {SITE_CONFIG.region} — unverbindlich.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.bereiche.map((g) => (
              <span
                key={g}
                className="rounded-full bg-surface-card/10 px-2.5 py-0.5 text-[10px] text-[#aaa]"
              >
                {gewerkLabel(g)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[18px] border border-border-default bg-muted p-5 text-center text-sm text-text-secondary">
          Für deine Angaben ergibt sich kein automatischer Preisrahmen — wir
          melden uns persönlich.
        </div>
      )}

      {state.breakdown.length > 0 ? (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-border-default bg-surface-card">
          {state.breakdown.map((row, i) => (
            <BreakdownRow key={`${row.gewerk}-${i}`} row={row} />
          ))}
          {hasRange ? (
            <div className="flex items-center justify-between bg-muted px-3.5 py-2.5 font-semibold">
              <span className="text-[13px] text-text-primary">Gesamt</span>
              <span className="text-[15px] tabular-nums text-text-primary">
                {formatCurrencyEUR(state.priceMin)} –{" "}
                {formatCurrencyEUR(state.priceMax)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasRange ? (
        <div>
          <p className="mb-3 mt-5 text-sm font-medium text-text-primary">
            Passt dieser Rahmen zu deinem Budget?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onBudgetChange?.("ok")}
              className={cn(
                "rounded-full border border-border-default px-4 py-2 text-sm font-medium transition-colors",
                budget === "ok"
                  ? "border-funnel-accent bg-funnel-accent text-white"
                  : "bg-surface-card text-text-secondary hover:border-text-tertiary"
              )}
            >
              Ja, passt gut
            </button>
            <button
              type="button"
              onClick={() => onBudgetChange?.("zu_hoch")}
              className={cn(
                "rounded-full border border-border-default px-4 py-2 text-sm font-medium transition-colors",
                budget === "zu_hoch"
                  ? "border-funnel-accent bg-funnel-accent text-white"
                  : "bg-surface-card text-text-secondary hover:border-text-tertiary"
              )}
            >
              Eher zu hoch
            </button>
          </div>
          {budget === "zu_hoch" ? (
            <p className="mt-3 rounded-xl border border-border-default bg-muted p-3 text-sm leading-relaxed text-text-secondary">
              Kein Problem — beim Termin besprechen wir Optionen die in dein
              Budget passen.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
