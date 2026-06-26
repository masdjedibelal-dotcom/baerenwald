"use client";

import { fmtPartnerEuro } from "@/lib/partner/partner-detail-format";
import {
  PARTNER_KONDITION_MWST,
  summeKonditionBrutto,
  summeKonditionNetto,
  type PartnerKonditionZeile,
} from "@/lib/partner/partner-konditionen";
import {
  PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL,
  PARTNER_LEISTUNGEN_VORSCHLAG_LABEL,
} from "@/lib/partner/partner-portal-display";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";
import { cn } from "@/lib/utils";

const GRID_COLS = "sm:grid-cols-[1fr_8.5rem_9rem]";

function formatVorschlag(netto: number | null | undefined): string {
  if (netto == null || netto <= 0) return "Preis folgt";
  return fmtPartnerEuro(netto);
}

function displayDeinPreis(
  z: PartnerKonditionZeile,
  mode: Props["mode"],
  hwValues?: Record<string, string>
): string {
  if (mode === "readonly") {
    if (z.hwNetto != null && z.hwNetto > 0) return fmtPartnerEuro(z.hwNetto);
    if (z.vorschlagNetto != null && z.vorschlagNetto > 0) return fmtPartnerEuro(z.vorschlagNetto);
    return "—";
  }
  const raw = hwValues?.[z.id] ?? "";
  if (raw.trim()) {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return fmtPartnerEuro(n);
  }
  if (z.vorschlagNetto != null && z.vorschlagNetto > 0) return fmtPartnerEuro(z.vorschlagNetto);
  return "—";
}

function isZeileGeaendert(z: PartnerKonditionZeile, hwValues?: Record<string, string>): boolean {
  const raw = hwValues?.[z.id] ?? "";
  if (!raw.trim()) return false;
  const hw = Number(raw.replace(",", "."));
  if (!Number.isFinite(hw)) return false;
  if (z.vorschlagNetto == null || z.vorschlagNetto <= 0) return hw > 0;
  return Math.abs(hw - z.vorschlagNetto) > 0.009;
}

type Props = {
  zeilen: PartnerKonditionZeile[];
  /** `edit` = Preis inline bearbeiten; `readonly` = gleiche Ansicht ohne Bearbeitung */
  mode: "edit" | "readonly";
  hwValues?: Record<string, string>;
  onHwChange?: (id: string, value: string) => void;
  gesamtLabel?: string;
};

export function PartnerLeistungenKonditionenCard({
  zeilen,
  mode,
  hwValues,
  onHwChange,
  gesamtLabel = "Vergütung Brutto inkl. MwSt.",
}: Props) {
  if (!zeilen.length) return null;

  const useHwForSum = true;
  const sumZeilen = zeilen.map((z) => {
    if (mode === "edit" && hwValues) {
      const raw = hwValues[z.id] ?? "";
      const n = raw.trim() ? Number(raw.replace(",", ".")) : null;
      const hwNetto = n != null && Number.isFinite(n) ? n : z.hwNetto ?? z.vorschlagNetto;
      return { ...z, hwNetto };
    }
    return z;
  });
  const sumNetto = summeKonditionNetto(sumZeilen, useHwForSum);
  const sumBrutto = summeKonditionBrutto(sumZeilen, useHwForSum);
  const sumMwst = Math.round((sumBrutto - sumNetto) * 100) / 100;

  return (
    <div className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
      <div
        className={cn(
          "hidden gap-3 border-b border-border-light bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary sm:grid",
          GRID_COLS
        )}
      >
        <span>Leistung</span>
        <span className="text-right">{PARTNER_LEISTUNGEN_VORSCHLAG_LABEL}</span>
        <span className="text-right">{PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL}</span>
      </div>

      <ul>
        {zeilen.map((z) => {
          const title = stripHtmlToPlainText(z.title) || z.title;
          const geaendert =
            mode === "readonly" ? z.geaendert : isZeileGeaendert(z, hwValues);
          const deinPreis = displayDeinPreis(z, mode, hwValues);
          const inputValue =
            hwValues?.[z.id] ??
            (z.vorschlagNetto != null && z.vorschlagNetto > 0
              ? String(z.vorschlagNetto).replace(".", ",")
              : "");

          return (
            <li
              key={z.id}
              className={cn(
                "border-b border-border-light px-4 py-3.5 last:border-b-0",
                geaendert && "bg-amber-50/60"
              )}
            >
              <div className={cn("grid gap-3 sm:items-center", GRID_COLS)}>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{title}</p>
                  {z.beschreibung ? (
                    <p className="portal-text-meta mt-0.5 text-text-secondary">
                      {stripHtmlToPlainText(z.beschreibung)}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-3 sm:hidden">
                    <div>
                      <p className="text-sm text-text-tertiary">
                        {PARTNER_LEISTUNGEN_VORSCHLAG_LABEL}:
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-base tabular-nums",
                          z.vorschlagNetto == null || z.vorschlagNetto <= 0
                            ? "italic text-sm text-text-tertiary"
                            : "font-semibold text-text-primary"
                        )}
                      >
                        {formatVorschlag(z.vorschlagNetto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">
                        {PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL}
                      </p>
                      {mode === "edit" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          className={cn(
                            "mt-1 w-full rounded-lg border border-border-default bg-surface-card px-3 py-2.5 text-right text-base font-medium tabular-nums text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                            geaendert && "border-amber-400"
                          )}
                          value={inputValue}
                          onChange={(e) => onHwChange?.(z.id, e.target.value)}
                          aria-label={`${PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL} für ${title}`}
                        />
                      ) : (
                        <p
                          className={cn(
                            "mt-0.5 text-base font-semibold tabular-nums text-text-primary",
                            geaendert && "text-amber-800"
                          )}
                        >
                          {deinPreis}
                        </p>
                      )}
                      {geaendert ? (
                        <span className="mt-1 block text-xs font-medium text-amber-700">
                          Geändert
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p
                  className={cn(
                    "hidden text-right text-base tabular-nums sm:block sm:text-lg",
                    z.vorschlagNetto == null || z.vorschlagNetto <= 0
                      ? "italic text-sm text-text-tertiary"
                      : "font-semibold text-text-secondary"
                  )}
                >
                  {formatVorschlag(z.vorschlagNetto)}
                </p>

                <div className="hidden text-right sm:block">
                  {mode === "edit" ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className={cn(
                          "w-full max-w-[9rem] rounded-lg border border-border-default bg-surface-card px-3 py-2 text-right text-base font-medium tabular-nums text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                          geaendert && "border-amber-400"
                        )}
                        value={inputValue}
                        onChange={(e) => onHwChange?.(z.id, e.target.value)}
                        aria-label={`${PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL} für ${title}`}
                      />
                      {geaendert ? (
                        <span className="text-xs font-medium text-amber-700">Geändert</span>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <p
                        className={cn(
                          "text-lg font-bold tabular-nums text-text-primary",
                          geaendert && "text-amber-800"
                        )}
                      >
                        {deinPreis}
                      </p>
                      {geaendert ? (
                        <span className="mt-0.5 block text-xs font-medium text-amber-700">
                          Geändert
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {sumNetto > 0 ? (
        <div className="border-t border-border-default bg-muted/40 px-4 py-3.5">
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
            <span className="text-lg font-bold tabular-nums text-text-primary">
              {fmtPartnerEuro(sumBrutto)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
