"use client";

import { useMemo, useState } from "react";

import { isAkutNotfall, shouldShowConsultationOnly } from "@/lib/funnel-config";
import { formatCurrencyEUR } from "@/lib/price-calc";
import { SituationIconPath } from "@/lib/situation-icons";
import type { FunnelState, PriceLineItem, Situation } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Hinweis vor Foto-Upload / Lead (export für Rechner & FunnelClient) */
export function LeadAvailabilityHint({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-l-[3px] border-funnel-accent py-3 pl-3.5 pr-3.5 text-[13px] leading-snug",
        className
      )}
      style={{
        backgroundColor: "var(--fl-accent-light, var(--accent-light, #EAF3DE))",
        color: "var(--fl-accent-dark, var(--accent-dark, #1a3d2b))",
        borderRadius: "0 8px 8px 0",
      }}
      role="note"
    >
      Wir prüfen nach deiner Anfrage die Verfügbarkeit unserer Handwerker und
      melden uns innerhalb von 24h zur Terminbestätigung.
    </div>
  );
}

export interface ResultScreenProps {
  state: FunnelState;
  companyPhone: string;
  cityLabel?: string;
  className?: string;
}

function gewerkLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function gewerkSquareClass(g: string): string {
  const x = g.toLowerCase();
  if (x.includes("maler")) return "bg-[#F0F4FF] text-[#185FA5]";
  if (x.includes("boden") || x.includes("fliesen") || x.includes("garten"))
    return "bg-[#EAF3DE] text-[#3B6D11]";
  if (x.includes("sanitaer") || x.includes("bad"))
    return "bg-[#E6F1FB] text-[#0C447C]";
  if (x.includes("elektro")) return "bg-[#FDF3DC] text-[#854F0B]";
  if (x.includes("shk") || x.includes("heizung"))
    return "bg-[#FDECEA] text-[#9C2B2B]";
  if (x.includes("reinigung")) return "bg-[#F1EFE8] text-[#5F5E5A]";
  return "bg-[#F0F4FF] text-[#185FA5]";
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

function B2bPrioLabel(v: string): string {
  const m: Record<string, string> = {
    zuverlaessigkeit: "Zuverlässigkeit",
    preis: "Preis",
    reaktion: "Reaktionszeit",
    alles: "Alles aus einer Hand",
  };
  return m[v] ?? v;
}

function storyNote(
  situation: Situation | null,
  flaeche: number,
  hours: number,
  zeitwert: number
): string | null {
  if (situation === "renovierung" || situation === "neubau") {
    return `Für ${flaeche} m² investierst du selbst ca. ${hours} Stunden pro Jahr — Zeitwert ~${formatCurrencyEUR(zeitwert)}.`;
  }
  if (situation === "pflege") {
    return "Regelmäßige Pflege kostet weniger als ein einmaliger Notfalleinsatz.";
  }
  return null;
}

export function ResultScreen({
  state,
  companyPhone,
  cityLabel = "München & Umgebung",
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

  const [budgetChoice, setBudgetChoice] = useState<"ja" | "hoch" | null>(null);

  const showUsp = state.gewerke.length > 1 || state.mode === "multi";

  const story = useMemo(
    () => storyNote(situation, flaeche, hours, zeitwert),
    [situation, flaeche, hours, zeitwert]
  );

  if (notfall) {
    const tel = companyPhone.replace(/\s/g, "");
    return (
      <div className={cn("space-y-6", className)}>
        <div className="relative overflow-hidden rounded-[18px] bg-[#C0392B] p-5 text-center text-white">
          {situation ? (
            <div
              className="pointer-events-none absolute right-3 top-1/2 w-24 -translate-y-1/2 text-white opacity-[0.07]"
              aria-hidden
            >
              <SituationIconPath situation={situation} />
            </div>
          ) : null}
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">
            Notfall
          </p>
          <p className="mt-3 text-lg font-semibold">Wir sind jetzt erreichbar</p>
          <a
            href={`tel:${tel}`}
            className="mt-2 block text-3xl font-extrabold tracking-tight"
          >
            {companyPhone}
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

  if (b2bConsult) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="rounded-[18px] border border-border-default bg-surface-card p-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Persönliches Angebot
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Für eure Standortstruktur planen wir am besten gemeinsam im
            Beratungsgespräch — der Online-Rechner reicht hier nicht.
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-full bg-funnel-accent py-3 text-sm font-semibold text-white"
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
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-[18px] bg-surface-dark p-5 text-white">
        {situation ? (
          <div
            className="pointer-events-none absolute right-3 top-1/2 w-24 -translate-y-1/2 text-white opacity-[0.07]"
            aria-hidden
          >
            <SituationIconPath situation={situation} />
          </div>
        ) : null}
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#777]">
          Dein Preisrahmen
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-1">
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-white">
            {formatCurrencyEUR(state.priceMin)}
          </span>
          <span className="text-lg text-[#555]">–</span>
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-white">
            {formatCurrencyEUR(state.priceMax)}
          </span>
          <span className="text-sm text-[#777]">€</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#666]">
          {noteParts.join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.gewerke.map((g) => (
            <span
              key={g}
              className="rounded-full bg-surface-card/10 px-2.5 py-0.5 text-[10px] text-[#aaa]"
            >
              {gewerkLabel(g)}
            </span>
          ))}
        </div>

        {showUsp ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/10 p-3">
            <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white">
              <svg className="size-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-[11px] leading-relaxed text-[#aaa]">
              <strong className="font-medium text-white">
                Ein Ansprechpartner, alle Handwerksleistungen
              </strong>
              <span className="mt-0.5 block">
                {state.situation === "b2b" && state.b2bPrio
                  ? `Euer Fokus: ${B2bPrioLabel(state.b2bPrio)} — wir spiegeln das in der Betreuung.`
                  : "Koordination aus einer Hand — weniger Stress für dich."}
              </span>
            </p>
          </div>
        ) : state.situation === "b2b" && state.b2bPrio ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/10 p-3">
            <p className="text-[11px] leading-relaxed text-[#aaa]">
              <strong className="font-medium text-white">Eure Priorität: </strong>
              {B2bPrioLabel(state.b2bPrio)}
            </p>
          </div>
        ) : null}
      </div>

      {!state.entscheider ? (
        <div className="rounded-xl border border-[#DCE6FF] bg-[#F6F8FE] p-3 text-[12px] leading-relaxed text-[#315AA8]">
          Ergebnis per Mail schicken zum Weiterleiten — du kannst trotzdem
          direkt anfragen, wenn du möchtest.
        </div>
      ) : null}

      <div className="mt-2.5 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        {state.priceBreakdown.map((row, i) => (
          <BreakdownRow key={`${row.gewerk}-${i}`} row={row} />
        ))}
        <div className="flex items-center justify-between bg-muted px-3.5 py-2.5 font-semibold">
          <span className="text-[13px] text-text-primary">Gesamt</span>
          <span className="text-[15px] tabular-nums text-text-primary">
            {formatCurrencyEUR(state.priceMin)} –{" "}
            {formatCurrencyEUR(state.priceMax)}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-3 mt-5 text-sm font-medium text-text-primary">
          Passt dieser Rahmen zu deinem Budget?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBudgetChoice("ja")}
            className={cn(
              "rounded-full border border-border-default px-4 py-2 text-sm font-medium transition-colors",
              budgetChoice === "ja"
                ? "border-funnel-accent bg-funnel-accent text-white"
                : "bg-surface-card text-text-secondary hover:border-text-tertiary"
            )}
          >
            Ja, passt gut
          </button>
          <button
            type="button"
            onClick={() => setBudgetChoice("hoch")}
            className={cn(
              "rounded-full border border-border-default px-4 py-2 text-sm font-medium transition-colors",
              budgetChoice === "hoch"
                ? "border-funnel-accent bg-funnel-accent text-white"
                : "bg-surface-card text-text-secondary hover:border-text-tertiary"
            )}
          >
            Eher zu hoch
          </button>
        </div>
        {budgetChoice === "hoch" ? (
          <p className="mt-3 rounded-xl border border-border-default bg-muted p-3 text-sm leading-relaxed text-text-secondary">
            Kein Problem — beim Termin besprechen wir Optionen die in dein
            Budget passen.
          </p>
        ) : null}
      </div>

      {story ? (
        <div className="mt-3 rounded-xl border border-[#DCE6FF] bg-[#F6F8FE] p-3 text-[12px] leading-relaxed text-[#315AA8]">
          {story}
        </div>
      ) : null}
    </div>
  );
}
