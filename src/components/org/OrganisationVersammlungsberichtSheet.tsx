"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { PortalCheckbox, PortalDate } from "@/components/shared/PortalFormControls";
import { PortalField } from "@/components/shared/PortalField";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { useFieldErrors } from "@/lib/portal2/form-schema";
import { portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";
import { TOAST } from "@/lib/portal-copy";

type ZeitraumPreset = "laufendes_jahr" | "letztes_jahr" | "12_monate" | "custom";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: ZeitraumPreset): { von: string; bis: string } {
  const now = new Date();
  const y = now.getFullYear();
  if (preset === "laufendes_jahr") {
    return { von: `${y}-01-01`, bis: isoDate(now) };
  }
  if (preset === "letztes_jahr") {
    return { von: `${y - 1}-01-01`, bis: `${y - 1}-12-31` };
  }
  const bis = isoDate(now);
  const vonDate = new Date(now);
  vonDate.setFullYear(vonDate.getFullYear() - 1);
  vonDate.setDate(vonDate.getDate() + 1);
  return { von: isoDate(vonDate), bis };
}

export function OrganisationVersammlungsberichtSheet({
  open,
  onClose,
  objektId,
}: {
  open: boolean;
  onClose: () => void;
  objektId: string;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const { fieldErrors, applyFieldErrors, clearField, clearFieldErrors } =
    useFieldErrors();
  const [preset, setPreset] = useState<ZeitraumPreset>("letztes_jahr");
  const [von, setVon] = useState(() => presetRange("letztes_jahr").von);
  const [bis, setBis] = useState(() => presetRange("letztes_jahr").bis);
  const [einzelpreise, setEinzelpreise] = useState(true);
  const [pending, startTransition] = useTransition();

  const previewLabel = useMemo(() => {
    if (!von && !bis) return "Zeitraum wählen";
    return `${von || "…"} – ${bis || "…"}`;
  }, [von, bis]);

  function applyPreset(p: ZeitraumPreset) {
    setPreset(p);
    clearFieldErrors();
    if (p === "custom") return;
    const r = presetRange(p);
    setVon(r.von);
    setBis(r.bis);
  }

  /* FORM_VALIDATION: org-versammlungsbericht */
  function exportPdf() {
    const errors: Record<string, string> = {};
    if (!von.trim()) errors.von = "Bitte Startdatum angeben.";
    if (!bis.trim()) errors.bis = "Bitte Enddatum angeben.";
    if (Object.keys(errors).length) {
      applyFieldErrors(errors, formRef.current);
      return;
    }
    clearFieldErrors();
    const params = new URLSearchParams({
      objektId: objektId.trim(),
      von: von.trim(),
      bis: bis.trim(),
      einzelpreise: einzelpreise ? "1" : "0",
    });
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/org/objekte/versammlungsbericht?${params}`
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          portalToastError(TOAST.pdf_fehlgeschlagen, j?.error);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        onClose();
      } catch {
        portalToastError(TOAST.export_fehlgeschlagen);
      }
    });
  }

  return (
    <PortalModalShell
      open={open}
      onClose={onClose}
      title="Versammlungsbericht"
      confirmLabel={pending ? "Wird erstellt …" : "PDF erstellen"}
      onConfirm={exportPdf}
      confirmDisabled={pending}
    >
      <div ref={formRef} className="space-y-5">
        <div>
          <p className="portal-text-label mb-2 text-text-secondary">Zeitraum</p>
          <div className="portal-sheet-chips mb-3">
            {(
              [
                ["laufendes_jahr", "Laufendes Jahr"],
                ["letztes_jahr", "Letztes Jahr"],
                ["12_monate", "Letzte 12 Monate"],
                ["custom", "Individuell"],
              ] as const
            ).map(([id, label]) => (
              <PortalButton
                variant="ghost"
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={cn(
                  "portal-sheet-chip",
                  preset === id && "is-active"
                )}
              >
                {label}
              </PortalButton>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PortalField label="Von" name="von" required error={fieldErrors.von}>
              <PortalDate
                className="portal-field w-full"
                value={von}
                onChange={(e) => {
                  setPreset("custom");
                  setVon(e.target.value);
                  clearField("von");
                }}
              />
            </PortalField>
            <PortalField label="Bis" name="bis" required error={fieldErrors.bis}>
              <PortalDate
                className="portal-field w-full"
                value={bis}
                onChange={(e) => {
                  setPreset("custom");
                  setBis(e.target.value);
                  clearField("bis");
                }}
              />
            </PortalField>
          </div>
          <p className="portal-text-meta mt-2 text-text-tertiary">
            Vorschau: {previewLabel}
          </p>
        </div>

        <div>
          <p className="portal-text-label mb-2 text-text-secondary">Inhalt</p>
          <label className="flex items-start gap-3">
            <PortalCheckbox
              className="mt-0.5"
              checked={einzelpreise}
              onChange={(e) => setEinzelpreise(e.target.checked)}
            />
            <span className="portal-text-body text-text-secondary">
              Einzelpreise in der Maßnahmenliste anzeigen
            </span>
          </label>
          <p className="portal-text-meta mt-2 text-text-tertiary">
            Der Bericht wird immer erzeugt — auch ohne Vorgänge oder Anlagen im
            Zeitraum.
          </p>
        </div>
      </div>
    </PortalModalShell>
  );
}
