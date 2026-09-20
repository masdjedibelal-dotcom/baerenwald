"use client";

import { useEffect, useRef } from "react";

import { PortalInput, PortalTextarea } from "@/components/shared/PortalFormControls";
import { PortalField } from "@/components/shared/PortalField";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { fmtPartnerEuro } from "@/lib/partner/partner-detail-format";
import { parseHwNettoInput } from "@/lib/partner/partner-konditionen";
import { useFieldErrors } from "@/lib/portal2/form-schema";
import { portalToastSaved } from "@/lib/shared/portal-toast";

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
  const formRef = useRef<HTMLDivElement>(null);
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } =
    useFieldErrors();

  useEffect(() => {
    if (!open) {
      clearFieldErrors();
      return;
    }
    const t = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, clearFieldErrors]);

  const parsed = parseHwNettoInput(value);
  const dirty = value.trim().length > 0 || notiz.trim().length > 0;

  /* FORM_VALIDATION: partner-preis-bearbeiten */
  function save() {
    if (parsed == null) {
      applyFieldErrors(
        {
          preis: value.trim()
            ? "Bitte einen gültigen Betrag eingeben."
            : "Bitte einen Betrag eingeben.",
        },
        formRef.current
      );
      return;
    }
    clearFieldErrors();
    onConfirm();
    portalToastSaved();
  }

  return (
    <PortalModalShell
      open={open}
      title="Preis bearbeiten"
      subtitle={leistungTitle}
      onClose={onCancel}
      variant="edit"
      dirty={dirty}
      onConfirm={save}
      confirmLabel="Speichern"
    >
      <div ref={formRef} className="space-y-4">
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

        <PortalField
          label="Ihr Angebotspreis netto"
          name="preis"
          required
          error={fieldErrors.preis}
        >
          <div className="flex items-center overflow-hidden rounded-sheet border border-border-default bg-surface-card focus-within:border-accent">
            <PortalInput
              ref={inputRef}
              type="text"
              inputMode="decimal"
              name="preis"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                clearField("preis");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              placeholder="0,00"
              className="portal-field min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-2xl font-semibold tabular-nums text-text-primary outline-none"
            />
            <span className="shrink-0 border-l border-border-light bg-muted/30 px-4 py-4 text-lg font-semibold text-text-tertiary">
              €
            </span>
          </div>
        </PortalField>

        <PortalField label="Notiz (optional)" name="notiz">
          <PortalTextarea
            value={notiz}
            onChange={(e) => onNotizChange(e.target.value)}
            rows={3}
            placeholder="z. B. Begründung für den angepassten Preis …"
            className="portal-input w-full resize-y rounded-field border border-border-default bg-surface-card px-3 py-2.5 text-sm"
          />
        </PortalField>
      </div>
    </PortalModalShell>
  );
}

export function formatPreisInputFromNumber(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  return formatEuroInput(n);
}
