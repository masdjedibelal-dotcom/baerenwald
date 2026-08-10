"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";

import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  required?: boolean;
  /** Name des File-Inputs im Formular */
  name?: string;
  /** Hidden-Feld für Capture-Zeitstempel (bei mehreren Slots unterscheiden). */
  captureAtName?: string;
  className?: string;
  /** Kompakter Slot (z. B. zwei Spalten Start/Ende). */
  compact?: boolean;
  onCaptured?: (file: File, captureAtIso: string) => void;
};

/**
 * Direkt-Kamera: capture=environment, kein Galerie-Default.
 */
export function PartnerDirektKameraSlot({
  label,
  required = true,
  name = "foto",
  captureAtName = "captureAt",
  className,
  compact = false,
  onCaptured,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [captureAt, setCaptureAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function openCamera() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const iso = new Date().toISOString();
    setCaptureAt(iso);
    setError(null);
    setStatus("uploading");

    try {
      const file = await normalizePartnerCameraPhoto(raw);
      const input = inputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      }

      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(file);
      setPreview(url);
      setStatus("done");
      onCaptured?.(file, iso);
    } catch {
      setStatus("idle");
      setPreview(null);
      setError("Foto konnte nicht verarbeitet werden. Bitte erneut aufnehmen.");
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[12px] font-semibold text-text-secondary">
        {label}
        {required ? (
          <span className="font-medium text-text-tertiary"> · Pflicht</span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={openCamera}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] text-center transition-colors hover:bg-[var(--p2-hover,#eef1ef)]",
          compact ? "px-2 py-5" : "px-4 py-8"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aufnahme"
            className={cn(
              "rounded-lg object-contain",
              compact ? "max-h-24" : "max-h-40"
            )}
          />
        ) : (
          <Camera
            className={cn(compact ? "h-6 w-6" : "h-8 w-8", "text-text-secondary")}
            aria-hidden
          />
        )}
        {status === "uploading" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            wird vorbereitet…
          </span>
        ) : status === "done" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-primary">
            <Check className="h-3.5 w-3.5" />
            Erfasst
          </span>
        ) : (
          <span className="text-[12px] font-semibold text-text-primary">
            Kamera öffnen
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        capture="environment"
        required={required && !preview}
        className="sr-only"
        onChange={onChange}
      />
      {captureAt ? (
        <input type="hidden" name={captureAtName} value={captureAt} />
      ) : null}
      {error ? <p className="text-xs text-text-secondary">{error}</p> : null}
    </div>
  );
}
