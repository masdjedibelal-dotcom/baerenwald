"use client";

import { isAkutNotfall, shouldShowConsultationOnly } from "@/lib/funnel-config";
import { formatCurrencyEUR } from "@/lib/price-calc";
import { SituationIconPath } from "@/lib/situation-icons";
import type { FunnelState, PriceLineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ResultScreenProps {
  state: FunnelState;
  companyPhone: string;
  cityLabel?: string;
  accentColor?: string;
  className?: string;
}

function gewerkLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function gewerkVisual(g: string): { bg: string; fg: string } {
  const x = g.toLowerCase();
  if (x.includes("maler"))
    return { bg: "#F0F4FF", fg: "#185FA5" };
  if (x.includes("boden") || x.includes("fliesen") || x.includes("garten"))
    return { bg: "#EAF3DE", fg: "#3B6D11" };
  if (x.includes("sanitaer") || x.includes("bad"))
    return { bg: "#E6F1FB", fg: "#0C447C" };
  if (x.includes("elektro"))
    return { bg: "#FDF3DC", fg: "#854F0B" };
  if (x.includes("shk") || x.includes("heizung"))
    return { bg: "#FDECEA", fg: "#9C2B2B" };
  if (x.includes("reinigung"))
    return { bg: "#F1EFE8", fg: "#5F5E5A" };
  return { bg: "#F0F4FF", fg: "#185FA5" };
}

function seasonMonths(frequenz: string): number {
  switch (frequenz) {
    case "woechentlich":
      return Math.round(12 * 4.33);
    case "zwewoechentlich":
      return Math.round(12 * 2.17);
    case "monatlich":
      return 12;
    case "saisonal":
      return 4;
    case "jaehrlich":
      return 1;
    case "bedarf":
      return 3;
    default:
      return 12;
  }
}

function BreakdownRow({ row }: { row: PriceLineItem }) {
  const { bg, fg } = gewerkVisual(row.gewerk);
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e8e8e8] px-[13px] py-2.5 last:border-0">
      <div className="flex min-w-0 gap-2">
        <div
          className="flex size-[26px] shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: bg, color: fg }}
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
          <p className="text-[11px] text-[#666]">{row.beschreibung}</p>
        </div>
      </div>
      <p className="shrink-0 text-[13px] font-medium tabular-nums text-text-primary">
        {formatCurrencyEUR(row.min)} – {formatCurrencyEUR(row.max)}
      </p>
    </div>
  );
}

function B2bPrioLabel(v: string): string {
  const m: Record<string, string> = {
    zuverlaessigkeit: "Zuverlässigkeit",
    preis: "Preis",
    reaktion: "Reaktionszeit",
    alles: "Alles aus einer Hand",
  };
  return m[v] ?? v;
}

export function ResultScreen({
  state,
  companyPhone,
  cityLabel = "München & Umgebung",
  accentColor = "#1B4332",
  className,
}: ResultScreenProps) {
  const b2bConsult = shouldShowConsultationOnly(state);
  const notfall = isAkutNotfall(state);
  const situation = state.situation;

  const flaeche = state.flaeche > 0 ? state.flaeche : 80;
  const sm = seasonMonths(state.frequenz);
  const hours = Math.round((flaeche / 50) * 1.8 * sm);
  const zeitwert = hours * 24;
  const year = new Date().getFullYear();

  if (notfall) {
    const tel = companyPhone.replace(/\s/g, "");
    return (
      <div className={cn("fade-in space-y-6", className)}>
        <div
          className="relative overflow-hidden rounded-[18px] px-5 py-[22px] text-center text-white"
          style={{ backgroundColor: "#C0392B" }}
        >
          {situation ? (
            <div
              className="pointer-events-none absolute right-3 top-1/2 w-[100px] -translate-y-1/2 opacity-[0.07]"
              aria-hidden
            >
              <SituationIconPath situation={situation} />
            </div>
          ) : null}
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
            Notfall
          </p>
          <p className="mt-3 text-lg font-semibold">Wir sind jetzt erreichbar</p>
          <a href={`tel:${tel}`} className="mt-2 block text-3xl font-bold tracking-tight">
            {companyPhone}
          </a>
          <a
            href={`tel:${tel}`}
            className="mt-5 inline-flex w-full max-w-xs justify-center rounded-[999px] bg-white px-6 py-3 text-sm font-semibold text-[#C0392B]"
          >
            Jetzt anrufen
          </a>
        </div>
      </div>
    );
  }

  if (b2bConsult) {
    return (
      <div className={cn("fade-in space-y-6", className)}>
        <div className="rounded-[18px] border border-[#e8e8e8] bg-white p-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Persönliches Angebot
          </h2>
          <p className="mt-2 text-[13px] leading-normal text-[#666]">
            Für eure Standortstruktur planen wir am besten gemeinsam im
            Beratungsgespräch — der Online-Rechner reicht hier nicht.
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-[999px] py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            Beratungsgespräch vereinbaren
          </button>
        </div>
      </div>
    );
  }

  const noteParts = [
    state.situation === "renovierung" ? "Renovierung" : null,
    state.flaeche > 0 ? `${state.flaeche} m²` : null,
    cityLabel,
    String(year),
  ].filter(Boolean);

  return (
    <div className={cn("fade-in space-y-5", className)}>
      <div className="relative overflow-hidden rounded-[18px] bg-[var(--funnel-hero-bg)] px-5 py-[22px] text-white">
        {situation ? (
          <div
            className="pointer-events-none absolute right-3 top-1/2 w-[100px] -translate-y-1/2 opacity-[0.07]"
            aria-hidden
          >
            <SituationIconPath situation={situation} />
          </div>
        ) : null}
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#777]">
          Dein Preisrahmen
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-[38px] font-bold tracking-[-0.02em]">
            {formatCurrencyEUR(state.priceMin)}
          </span>
          <span className="text-base text-[#555]">–</span>
          <span className="text-[38px] font-bold tracking-[-0.02em]">
            {formatCurrencyEUR(state.priceMax)}
          </span>
          <span className="text-[15px] text-[#777]">€</span>
        </div>
        <p className="mt-2 text-[11px] leading-normal text-[#666]">
          {noteParts.join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {state.gewerke.map((g) => (
            <span
              key={g}
              className="rounded-[999px] bg-white/10 px-2 py-0.5 text-[10px] text-[#aaa]"
            >
              {gewerkLabel(g)}
            </span>
          ))}
        </div>

        {state.mode === "multi" ? (
          <div
            className="mt-4 flex gap-2 rounded-[9px] border border-white/[0.08] bg-[var(--funnel-hero-inner)] p-2.5"
          >
            <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-white/[0.07] text-white">
              <svg className="size-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0 text-[11px] leading-snug text-[#aaa]">
              <p>
                <span className="font-semibold text-white">
                  Ein Ansprechpartner, alle Gewerke
                </span>
              </p>
              <p className="mt-0.5">
                {state.situation === "b2b" && state.b2bPrio
                  ? `Euer Fokus: ${B2bPrioLabel(state.b2bPrio)} — wir spiegeln das in der Betreuung.`
                  : "Koordination aus einer Hand — weniger Stress für dich."}
              </p>
            </div>
          </div>
        ) : state.situation === "b2b" && state.b2bPrio ? (
          <div className="mt-4 flex gap-2 rounded-[9px] border border-white/[0.08] bg-[var(--funnel-hero-inner)] p-2.5">
            <div className="text-[11px] leading-snug text-[#aaa]">
              <span className="font-semibold text-white">Eure Priorität: </span>
              {B2bPrioLabel(state.b2bPrio)}
            </div>
          </div>
        ) : null}
      </div>

      {!state.entscheider ? (
        <div className="rounded-[var(--r)] border border-[#DCE6FF] bg-[#F6F8FE] px-[13px] py-2.5 text-[12px] leading-relaxed text-[#315AA8]">
          Ergebnis per Mail schicken zum Weiterleiten — du kannst trotzdem
          direkt anfragen, wenn du möchtest.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[var(--r)] border border-[#e8e8e8] bg-white">
        {state.priceBreakdown.map((row, i) => (
          <BreakdownRow key={`${row.gewerk}-${i}`} row={row} />
        ))}
        <div className="flex items-center justify-between bg-[#fafafa] px-[13px] py-2.5">
          <span className="text-[13px] font-bold text-text-primary">Gesamt</span>
          <span className="text-[15px] font-semibold tabular-nums text-text-primary">
            {formatCurrencyEUR(state.priceMin)} –{" "}
            {formatCurrencyEUR(state.priceMax)}
          </span>
        </div>
      </div>

      <div className="rounded-[var(--r)] border border-[#DCE6FF] bg-[#F6F8FE] px-[13px] py-2.5 text-[12px] leading-snug text-[#315AA8]">
        Für {flaeche} m² investierst du selbst ca. {hours}h/Jahr — Zeitwert ~{" "}
        {formatCurrencyEUR(zeitwert)}.
      </div>
    </div>
  );
}
