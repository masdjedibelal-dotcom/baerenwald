"use client";

import { useMemo, useState } from "react";

import { formatCurrencyEUR } from "@/lib/price-calc";
import type { BudgetCheck, FunnelState, PriceLineItem } from "@/lib/funnel/types";
import {
  getBwPreisFaktorHint,
  getBwResultModus,
} from "@/lib/funnel/price-calc";
import type { BwResultModus } from "@/lib/funnel/price-calc";
import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

const RESULT_TESTIMONIALS = [
  {
    quote: "Transparenter Preis, pünktlicher Handwerker.",
    name: "Familie K.",
    ort: "Schwabing",
    initials: "FK",
    bg: "#eaf3de",
    color: "#2e7d52",
  },
  {
    quote: "Ein Anruf — alles lief. Kein Stress.",
    name: "Lena M.",
    ort: "Maxvorstadt",
    initials: "LM",
    bg: "#e0f2f1",
    color: "#00695c",
  },
  {
    quote: "Innerhalb 24h war jemand da.",
    name: "Sandra B.",
    ort: "Bogenhausen",
    initials: "SB",
    bg: "#e3f2fd",
    color: "#1565c0",
  },
] as const;

const TRUST_POINTS = [
  "Meisterbetriebe München",
  "Ein Ansprechpartner",
  "Anfahrt bei Auftrag angerechnet",
] as const;

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6l3 3 5-5"
        stroke="var(--fl-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPreisfaktoren(state: FunnelState): string[] {
  const punkte: string[] = [];

  if (state.zustand === "mittel") {
    punkte.push("Vorarbeiten nötig — Fläche muss vorbereitet werden");
  }
  if (state.zustand === "schlecht") {
    punkte.push("Erheblicher Mehraufwand durch den Zustand der Fläche");
  }
  if (state.zugaenglichkeit === "mittel") {
    punkte.push("Erschwerte Erreichbarkeit erhöht den Materialaufwand");
  }
  if (state.zugaenglichkeit === "schwer") {
    punkte.push("Schwer zugängliches Objekt — Spezialausrüstung erforderlich");
  }
  if (
    state.dringlichkeit === "akut" ||
    state.dringlichkeit === "stabil"
  ) {
    punkte.push("Kurzfristiger Einsatz — Terminpriorität berücksichtigt");
  }
  if (state.zeitraum === "sofort" || state.zeitraum === "heute") {
    punkte.push("Kurzfristiger Einsatz — Terminpriorität berücksichtigt");
  }
  if (state.kundentyp === "mieter") {
    punkte.push("Mietobjekt — Abstimmung mit Vermieter möglicherweise nötig");
  }
  if (state.fachdetails?.sanitaer?.lage === "wand") {
    punkte.push("Leck hinter der Wand — Stemmarbeiten wahrscheinlich");
  }
  if (state.fachdetails?.boden?.verlegung === "geklebt") {
    punkte.push("Geklebter Altbelag muss aufwendig entfernt werden");
  }
  if (state.fachdetails?.boden?.aktuell === "fliesen") {
    punkte.push("Fliesenrückbau ist zeitaufwendig und materialintensiv");
  }
  if (state.fachdetails?.maler?.zustand === "risse") {
    punkte.push("Wandvorbereitung nötig — Spachteln und Schleifen");
  }
  if (state.fachdetails?.maler?.zustand === "stark") {
    punkte.push("Starke Schäden erfordern umfangreiche Vorarbeiten");
  }
  if (state.fachdetails?.dach?.alter === "ueber40") {
    punkte.push("Älteres Dach — mögliche Zusatzschäden beim Aufdecken");
  }
  if (state.bereiche.length >= 3) {
    punkte.push("Mehrere Gewerke — wir koordinieren alle Arbeiten");
  }

  const seen = new Set<string>();
  return punkte.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 2h6l6 6-6 6-6-6V2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PreisAccordion({
  state,
  koordinationsRabatt,
}: {
  state: FunnelState;
  koordinationsRabatt: number;
}) {
  const [open, setOpen] = useState(false);
  const faktoren = useMemo(() => getPreisfaktoren(state), [state]);

  if (state.breakdown.length === 0) return null;

  const hasRabatt = koordinationsRabatt < 1.0;
  const rabattProzent = Math.round((1 - koordinationsRabatt) * 100);

  return (
    <div className="preis-accordion">
      <button
        type="button"
        className={`preis-accordion-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Wie setzt sich der Preis zusammen?</span>
        <svg
          className="preis-accordion-arrow"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="preis-accordion-body">
          <table className="preis-breakdown-table">
            <thead>
              <tr>
                <th>Leistung</th>
                <th>Von</th>
                <th>Bis</th>
              </tr>
            </thead>
            <tbody>
              {state.breakdown.map((item, i) => (
                <tr key={i}>
                  <td>{item.beschreibung}</td>
                  <td>{item.min.toLocaleString("de")} €</td>
                  <td>{item.max.toLocaleString("de")} €</td>
                </tr>
              ))}
              {hasRabatt ? (
                <tr className="preis-breakdown-rabatt">
                  <td>Koordinationsrabatt</td>
                  <td
                    colSpan={2}
                    style={{ color: "var(--fl-accent)", textAlign: "right" }}
                  >
                    −{rabattProzent}&thinsp;%
                  </td>
                </tr>
              ) : null}
              {state.breakdown.length > 1 ? (
                <tr className="preis-breakdown-total">
                  <td>Gesamt</td>
                  <td>{state.priceMin.toLocaleString("de")} €</td>
                  <td>{state.priceMax.toLocaleString("de")} €</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {faktoren.length > 0 ? (
            <div className="preis-faktoren">
              <p className="preis-faktoren-label">Warum dieser Preisrahmen?</p>
              <ul className="preis-faktoren-list">
                {faktoren.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultTrustBlock() {
  const t = useMemo(
    () => RESULT_TESTIMONIALS[Math.floor(Math.random() * RESULT_TESTIMONIALS.length)],
    []
  );
  return (
    <div className="result-trust-block">
      <div className="result-trust-quote">
        <div className="result-trust-stars">{"★".repeat(5)}</div>
        <p className="result-trust-text">„{t.quote}"</p>
        <div className="result-trust-author">
          <div
            className="result-trust-avatar"
            style={{ background: t.bg, color: t.color }}
          >
            {t.initials}
          </div>
          <div>
            <div className="result-trust-name">{t.name}</div>
            <div className="result-trust-ort">{t.ort}</div>
          </div>
        </div>
      </div>
      <div className="result-trust-points">
        {TRUST_POINTS.map((point) => (
          <div key={point} className="result-trust-point">
            <CheckIcon />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BwResultScreenProps {
  state: FunnelState;
  onBudgetChange?: (v: BudgetCheck) => void;
  mindestauftragAktiv?: boolean;
  plzFaktor?: number;
  koordinationsRabatt?: number;
  resultModus?: BwResultModus;
  schwellenwertAusgeloest?: boolean;
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
  mindestauftragAktiv,
  plzFaktor = 1.0,
  koordinationsRabatt = 1.0,
  resultModus,
  schwellenwertAusgeloest = false,
  className,
}: BwResultScreenProps) {
  const notfallAkut =
    state.situation === "notfall" && state.dringlichkeit === "akut";
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
            href={SITE_CONFIG.phoneHref}
            className="mt-2 block text-3xl font-extrabold tracking-tight"
          >
            {SITE_CONFIG.phone}
          </a>
          <p className="mt-1 text-sm text-white/70">
            Mobil · oder Büro:{" "}
            <a href={SITE_CONFIG.phoneFestnetHref} className="underline text-white">
              {SITE_CONFIG.phoneFestnetz}
            </a>
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            className="mt-5 inline-flex w-full max-w-xs justify-center rounded-full bg-surface-card px-6 py-3 text-sm font-semibold text-[#C0392B]"
          >
            Jetzt anrufen
          </a>
        </div>
      </div>
    );
  }

  const isZuKomplex =
    resultModus === "zu_komplex" || getBwResultModus(state) === "zu_komplex";

  if (isZuKomplex) {
    const zuKomplexSubline = schwellenwertAusgeloest
      ? "Dein Projekt liegt in einer Größenordnung, wo ein automatischer Preis nicht seriös wäre — zu viele Details beeinflussen das Ergebnis. Wir besprechen das persönlich und erstellen ein genaues Festpreisangebot."
      : "Wir melden uns gern telefonisch und gehen alles mit dir durch.";

    return (
      <div className={cn("space-y-5", className)}>
        <div className="rounded-[18px] border border-amber-200 bg-amber-50/90 p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-900/70">
            Individuelle Planung
          </p>
          <p className="mt-2 text-[15px] font-semibold leading-snug text-text-primary">
            Für dein Vorhaben brauchen wir einen persönlichen Termin — ein
            fester Online-Preisrahmen wäre hier irreführend.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            {zuKomplexSubline}
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            className="mt-4 inline-flex w-full max-w-xs justify-center rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white"
          >
            {SITE_CONFIG.phone} — anrufen
          </a>
          <p className="mt-2 text-[12px] text-text-secondary">
            Oder Büro:{" "}
            <a href={SITE_CONFIG.phoneFestnetHref} className="underline">
              {SITE_CONFIG.phoneFestnetz}
            </a>
          </p>
        </div>
      </div>
    );
  }

  const hasRange = state.priceMin > 0 && state.priceMax > 0;
  const preisFaktorHint = getBwPreisFaktorHint(state);
  const preisFaktorStandard =
    preisFaktorHint === "Standardpreis für München 2026";

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
          <p
            className="mt-2 text-[12px] leading-relaxed"
            style={{
              color: "var(--fl-text-3, #9e9e9e)",
            }}
          >
            {preisFaktorStandard ? (
              preisFaktorHint
            ) : (
              <>
                Preis beeinflusst durch: {preisFaktorHint}
              </>
            )}
          </p>
          {plzFaktor > 1.08 ? (
            <p style={{ fontSize: "12px", color: "var(--fl-text-3, #9e9e9e)", marginTop: "6px" }}>
              Münchner Innenstadtlage berücksichtigt
            </p>
          ) : null}
          {koordinationsRabatt < 1.0 ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--fl-accent)",
                background: "var(--fl-accent-light)",
                borderRadius: "999px",
                padding: "4px 10px",
                marginTop: "8px",
              }}
            >
              <TagIcon />
              {koordinationsRabatt <= 0.90
                ? "10% Koordinationsrabatt für mehrere Gewerke"
                : "5% Koordinationsrabatt für mehrere Gewerke"}
            </div>
          ) : null}
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

      {hasRange ? (
        <p className="preis-disclaimer">
          * Unverbindlicher Richtwert basierend auf Ihren Angaben. Das
          verbindliche Festpreisangebot erhalten Sie nach dem Vor-Ort-Termin.
          Preise inkl. MwSt.
        </p>
      ) : null}

      {hasRange && resultModus === "preisrahmen_warnung" ? (
        <div className="preis-warnung-box">
          <div className="preis-warnung-icon">⚠</div>
          <div>
            <p className="preis-warnung-head">Größeres Projekt — Richtwert</p>
            <p className="preis-warnung-text">
              Bei Projekten dieser Größenordnung kann der finale Preis stärker
              abweichen. Wir schauen uns das beim Vor-Ort-Termin genau an und
              erstellen ein verbindliches Festpreisangebot.
            </p>
          </div>
        </div>
      ) : null}

      {hasRange ? <PreisAccordion state={state} koordinationsRabatt={koordinationsRabatt} /> : null}

      {mindestauftragAktiv ? (
        <div
          className="hinweis"
          style={{ marginTop: "12px" }}
        >
          <p>
            Mindestauftragswert 150 € — inklusive Anfahrt und erster Einschätzung
            vor Ort.
          </p>
        </div>
      ) : null}

      {hasRange ? <ResultTrustBlock /> : null}

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
