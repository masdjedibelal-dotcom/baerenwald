"use client";

import { useMemo, useState, useTransition } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { portalToastError } from "@/lib/shared/portal-toast";

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
    if (p === "custom") return;
    const r = presetRange(p);
    setVon(r.von);
    setBis(r.bis);
  }

  function exportPdf() {
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
          portalToastError("PDF fehlgeschlagen", j?.error);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        onClose();
      } catch {
        portalToastError("Export fehlgeschlagen");
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
      confirmDisabled={pending || !von.trim() || !bis.trim()}
    >
      <div className="space-y-5">
        <div>
          <p className="portal-text-label mb-2 text-text-secondary">Zeitraum</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["laufendes_jahr", "Laufendes Jahr"],
                ["letztes_jahr", "Letztes Jahr"],
                ["12_monate", "Letzte 12 Monate"],
                ["custom", "Individuell"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={`rounded-full border px-3 py-1 text-[13px] ${
                  preset === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-light text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="portal-text-label mb-1.5 block text-text-secondary">
                Von
              </span>
              <input
                type="date"
                className="portal-field w-full"
                value={von}
                onChange={(e) => {
                  setPreset("custom");
                  setVon(e.target.value);
                }}
              />
            </label>
            <label className="block">
              <span className="portal-text-label mb-1.5 block text-text-secondary">
                Bis
              </span>
              <input
                type="date"
                className="portal-field w-full"
                value={bis}
                onChange={(e) => {
                  setPreset("custom");
                  setBis(e.target.value);
                }}
              />
            </label>
          </div>
          <p className="portal-text-meta mt-2 text-text-tertiary">
            Vorschau: {previewLabel}
          </p>
        </div>

        <div>
          <p className="portal-text-label mb-2 text-text-secondary">Inhalt</p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={einzelpreise}
              onChange={(e) => setEinzelpreise(e.target.checked)}
            />
            <span className="text-[13px] text-text-secondary">
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
