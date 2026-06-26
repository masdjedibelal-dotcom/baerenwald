"use client";

import { cn } from "@/lib/utils";
import { fmtPartnerEuro } from "@/lib/partner/partner-detail-format";
import {
  PARTNER_KONDITION_MWST,
  summeKonditionBrutto,
  summeKonditionNetto,
  type PartnerKonditionZeile,
} from "@/lib/partner/partner-konditionen";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

function formatVorschlag(netto: number | null | undefined): string {
  if (netto == null || netto <= 0) return "Preis folgt";
  return fmtPartnerEuro(netto);
}

type Props = {
  zeilen: PartnerKonditionZeile[];
  mode: "vorschlag" | "edit" | "eingereicht";
  hwValues?: Record<string, string>;
  onHwChange?: (id: string, value: string) => void;
  gesamtLabel?: string;
  /** Spaltenüberschrift für EK/Vorschlag (Standard: „Vorschlag netto“). */
  vorschlagColumnLabel?: string;
};

export function PartnerLeistungenKonditionenCard({
  zeilen,
  mode,
  hwValues,
  onHwChange,
  gesamtLabel = "Vergütung Brutto inkl. MwSt.",
  vorschlagColumnLabel = "Vorschlag netto",
}: Props) {
  if (!zeilen.length) return null;

  const showHwColumn = mode === "edit" || mode === "eingereicht";
  const useHwForSum = mode === "eingereicht";
  const sumNetto = summeKonditionNetto(zeilen, useHwForSum);
  const sumBrutto = summeKonditionBrutto(zeilen, useHwForSum);
  const sumMwst = Math.round((sumBrutto - sumNetto) * 100) / 100;

  return (
    <div className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
      <div
        className={cn(
          "hidden gap-3 border-b border-border-light bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary sm:grid",
          showHwColumn ? "sm:grid-cols-[1fr_7rem_7rem]" : "sm:grid-cols-[1fr_7rem]"
        )}
      >
        <span>Leistung</span>
        <span className="text-right">{vorschlagColumnLabel}</span>
        {showHwColumn ? <span className="text-right">Dein Preis netto</span> : null}
      </div>

      <ul>
        {zeilen.map((z, i) => {
          const title = stripHtmlToPlainText(z.title) || z.title;
          const hwRaw = hwValues?.[z.id] ?? "";
          const hwNum =
            mode === "eingereicht"
              ? z.hwNetto
              : hwRaw.trim()
                ? Number(hwRaw.replace(",", "."))
                : null;
          const hwDisplay =
            mode === "eingereicht" && z.hwNetto != null
              ? fmtPartnerEuro(z.hwNetto)
              : null;

          return (
            <li
              key={z.id}
              className={cn(
                "border-b border-border-light px-3 py-3 last:border-b-0",
                z.geaendert && mode === "eingereicht" && "bg-amber-50/50"
              )}
            >
              <div
                className={cn(
                  "grid gap-2 sm:items-start sm:gap-3",
                  showHwColumn ? "sm:grid-cols-[1fr_7rem_7rem]" : "sm:grid-cols-[1fr_7rem]"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{title}</p>
                  {z.beschreibung ? (
                    <p className="portal-text-meta mt-0.5 text-text-secondary">
                      {stripHtmlToPlainText(z.beschreibung)}
                    </p>
                  ) : null}
                  <p className="portal-text-meta mt-1 text-text-tertiary sm:hidden">
                    {vorschlagColumnLabel}:{" "}
                    <span
                      className={
                        z.vorschlagNetto == null || z.vorschlagNetto <= 0
                          ? "italic"
                          : "font-medium text-text-secondary"
                      }
                    >
                      {formatVorschlag(z.vorschlagNetto)}
                    </span>
                  </p>
                </div>

                <p
                  className={cn(
                    "hidden text-right tabular-nums sm:block",
                    z.vorschlagNetto == null || z.vorschlagNetto <= 0
                      ? "italic text-text-tertiary"
                      : "font-medium text-text-secondary"
                  )}
                >
                  {formatVorschlag(z.vorschlagNetto)}
                </p>

                {showHwColumn ? (
                  mode === "edit" ? (
                    <label className="block sm:text-right">
                      <span className="portal-text-meta mb-1 block text-text-tertiary sm:sr-only">
                        Dein Preis netto
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hwRaw}
                        onChange={(e) => onHwChange?.(z.id, e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-right text-base tabular-nums sm:max-w-[7rem] sm:ml-auto"
                        aria-label={`Dein Preis netto für ${title}`}
                      />
                    </label>
                  ) : (
                    <p className="text-right font-semibold tabular-nums text-text-primary">
                      {hwDisplay ?? "—"}
                      {z.geaendert ? (
                        <span className="mt-0.5 block text-xs font-normal text-amber-700">
                          Geändert
                        </span>
                      ) : null}
                    </p>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {sumNetto > 0 ? (
        <div className="border-t border-border-default bg-muted/40 px-3 py-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-text-tertiary">Summe netto</span>
            <span className="font-medium tabular-nums text-text-primary">
              {fmtPartnerEuro(sumNetto)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4 text-sm">
            <span className="text-text-tertiary">MwSt. ({PARTNER_KONDITION_MWST} %)</span>
            <span className="tabular-nums text-text-secondary">{fmtPartnerEuro(sumMwst)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border-light pt-2">
            <span className="font-semibold text-text-primary">{gesamtLabel}</span>
            <span className="font-bold tabular-nums text-text-primary">
              {fmtPartnerEuro(sumBrutto)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
