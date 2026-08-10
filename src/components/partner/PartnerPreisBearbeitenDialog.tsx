"use client";

import { useEffect, useRef } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
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
  notiz: string;
  onNotizChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PartnerPreisBearbeitenDialog({
  open,
  leistungTitle,
  vorschlagNetto,
  value,
  onChange,
  notiz,
  onNotizChange,
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

  const parsed = parseHwNettoInput(value);
  const invalid = value.trim().length > 0 && parsed == null;
  const dirty = value.trim().length > 0 || notiz.trim().length > 0;

  return (
    <PortalModalShell
      open={open}
      title="Preis bearbeiten"
      subtitle={leistungTitle}
      onClose={onCancel}
      variant="edit"
      dirty={dirty}
      onConfirm={onConfirm}
      confirmDisabled={parsed == null}
      confirmLabel="Übernehmen"
    >
      {vorschlagNetto != null && vorschlagNetto > 0 ? (
        <p className="portal-text-meta text-text-tertiary">
          Vorschlag von Bärenwald:{" "}
          <span className="font-semibold text-text-secondary">
            {fmtPartnerEuro(vorschlagNetto)}
          </span>{" "}
          netto
        </p>
      ) : (
        <p className="portal-text-meta italic text-text-tertiary">
          Für diese Leistung liegt noch kein Vorschlag vor.
        </p>
      )}

      <label className="mt-4 block">
        <span className="portal-form-label">Dein Angebotspreis netto</span>
        <div
          className={cn(
            "mt-2 flex items-center overflow-hidden rounded-xl border bg-surface-card",
            invalid
              ? "border-red-300"
              : "border-border-default focus-within:border-accent"
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
          <p className="mt-1.5 text-sm text-red-600">
            Bitte einen gültigen Betrag eingeben.
          </p>
        ) : null}
      </label>

      <label className="mt-4 block">
        <span className="portal-form-label">Notiz (optional)</span>
        <textarea
          value={notiz}
          onChange={(e) => onNotizChange(e.target.value)}
          rows={3}
          placeholder="z. B. Begründung für den angepassten Preis …"
          className="portal-input mt-2 w-full resize-y rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-sm"
        />
      </label>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-pill-outline portal-btn"
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={parsed == null}
          onClick={onConfirm}
          className="btn-pill-primary portal-btn disabled:opacity-50"
        >
          Übernehmen
        </button>
      </div>
    </PortalModalShell>
  );
}

export function formatPreisInputFromNumber(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  return formatEuroInput(n);
}
