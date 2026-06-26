"use client";

import { useEffect, useRef } from "react";

import { fmtPartnerEuro } from "@/lib/partner/partner-detail-format";
import { parseHwNettoInput } from "@/lib/partner/partner-konditionen";
import { cn } from "@/lib/utils";

function formatEuroInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

type Props = {
  open: boolean;
  leistungTitle: string;
  vorschlagNetto: number | null;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PartnerPreisBearbeitenDialog({
  open,
  leistungTitle,
  vorschlagNetto,
  value,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const parsed = parseHwNettoInput(value);
  const invalid = value.trim().length > 0 && parsed == null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preis-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-5 shadow-xl">
        <h4 id="preis-dialog-title" className="font-display text-lg font-semibold text-text-primary">
          Preis bearbeiten
        </h4>
        <p className="portal-text-body mt-1 text-text-secondary">{leistungTitle}</p>
        {vorschlagNetto != null && vorschlagNetto > 0 ? (
          <p className="portal-text-meta mt-2 text-text-tertiary">
            Vorschlag von Bärenwald:{" "}
            <span className="font-semibold text-text-secondary">{fmtPartnerEuro(vorschlagNetto)}</span>{" "}
            netto
          </p>
        ) : (
          <p className="portal-text-meta mt-2 italic text-text-tertiary">
            Für diese Leistung liegt noch kein Vorschlag vor.
          </p>
        )}

        <label className="mt-5 block">
          <span className="portal-form-label">Dein Preis netto</span>
          <div
            className={cn(
              "mt-2 flex items-center overflow-hidden rounded-xl border bg-surface-card",
              invalid ? "border-red-300" : "border-border-default focus-within:border-accent"
            )}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && parsed != null) onConfirm();
                if (e.key === "Escape") onCancel();
              }}
              placeholder="0,00"
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-2xl font-semibold tabular-nums text-text-primary outline-none"
              aria-invalid={invalid}
            />
            <span className="shrink-0 border-l border-border-light bg-muted/30 px-4 py-4 text-lg font-semibold text-text-tertiary">
              €
            </span>
          </div>
          {invalid ? (
            <p className="mt-1.5 text-sm text-red-600">Bitte einen gültigen Betrag eingeben.</p>
          ) : null}
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={parsed == null}
            onClick={onConfirm}
            className="btn-pill-primary portal-btn !px-4 !py-2.5 disabled:opacity-50"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}

export function formatPreisInputFromNumber(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  return formatEuroInput(n);
}
