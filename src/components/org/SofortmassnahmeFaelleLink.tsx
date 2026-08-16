"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  akutFallLabel,
  SOFORTMASSNAHME_FAELLE_FOOTNOTE,
  SOFORTMASSNAHME_FAELLE_INTRO,
  SOFORTMASSNAHME_FAELLE_POPUP_TITLE,
  sofortmassnahmeFaelleGruppen,
  type AkutFallId,
} from "@/lib/org/sofortmassnahme-faelle";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type EditorProps = {
  selected: readonly string[];
  onChange: (next: AkutFallId[]) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Leere Liste + Fälle aus Katalog hinzufügen (nur Org-Einstellungen).
 */
export function SofortmassnahmeFaelleEditor({
  selected,
  onChange,
  disabled = false,
  className,
}: EditorProps) {
  const [katalogOpen, setKatalogOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const gruppen = useMemo(() => sofortmassnahmeFaelleGruppen(), []);

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id) as AkutFallId[]);
  }

  function add(id: AkutFallId) {
    if (selectedSet.has(id)) return;
    onChange([...selected, id] as AkutFallId[]);
  }

  const availableCount = gruppen.reduce(
    (n, g) => n + g.faelle.filter((f) => !selectedSet.has(f.id)).length,
    0
  );

  return (
    <div className={cn("space-y-2", className)}>
      <p
        className="text-[13px] leading-[1.55]"
        style={{ color: PORTAL_VAR.sub }}
      >
        {SOFORTMASSNAHME_FAELLE_INTRO}
      </p>

      {selected.length === 0 ? (
        <p
          className="rounded-lg border border-dashed px-3 py-3 text-[13px]"
          style={{
            borderColor: "var(--p2-border, #d8d8d4)",
            color: PORTAL_VAR.sub,
          }}
        >
          Noch keine Fälle — nichts geht direkt.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {selected.map((id) => (
            <li
              key={id}
              className="flex items-start gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--p2-border, #d8d8d4)" }}
            >
              <span className="min-w-0 flex-1 text-[13px] leading-[1.45]">
                {akutFallLabel(id)}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-text-tertiary hover:text-text-primary"
                  aria-label="Fall entfernen"
                  onClick={() => remove(id)}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!disabled && availableCount > 0 ? (
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold",
            "text-[var(--org-primary,var(--p2-primary,#2e7d52))]",
            "bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))]",
            "hover:bg-[var(--org-primary,var(--p2-primary,#2e7d52))] hover:text-white",
            "transition-colors"
          )}
          onClick={() => setKatalogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        </button>
      ) : null}

      <p className="text-[12px] leading-[1.45]" style={{ color: PORTAL_VAR.sub }}>
        {SOFORTMASSNAHME_FAELLE_FOOTNOTE}
      </p>

      <PortalModalShell
        open={katalogOpen}
        title={SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        onClose={() => setKatalogOpen(false)}
        variant="confirm"
      >
        <div className="space-y-3.5">
          {gruppen.map((g) => {
            const openFaelle = g.faelle.filter((f) => !selectedSet.has(f.id));
            if (!openFaelle.length) return null;
            return (
              <div key={g.bereich}>
                <p className="portal-text-card-title font-semibold">
                  {g.bereich}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {openFaelle.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                          "hover:bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))]"
                        )}
                        onClick={() => {
                          add(f.id);
                        }}
                      >
                        <Plus className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                        <span>{f.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </PortalModalShell>
    </div>
  );
}

/** Titelzeile ohne Fälle-Link (Objekt: nur An/Aus). */
export function SofortmassnahmeAkutTitle({
  className,
}: {
  className?: string;
}) {
  return (
    <span className={className}>Direktbeauftragung bei Sofortmaßnahme</span>
  );
}

/** @deprecated Alias — Objekt/Listen ohne Editor */
export function SofortmassnahmeAkutTitleWithFaelle({
  className,
}: {
  className?: string;
}) {
  return <SofortmassnahmeAkutTitle className={className} />;
}
