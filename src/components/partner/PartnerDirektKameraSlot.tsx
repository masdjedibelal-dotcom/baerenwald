"use client";

import { useRef, useState } from "react";
import { Camera, Check, ImageIcon, Loader2 } from "lucide-react";

import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
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
 * Foto-Slot: mobil Kamera + Mediathek, Desktop nur Foto hochladen.
 * Kein HTML-`required` auf versteckten Inputs (sonst hängt der Submit ohne Feedback).
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
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsPortalMobile();
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [captureAt, setCaptureAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    const iso = new Date().toISOString();
    setCaptureAt(iso);
    setError(null);
    setStatus("uploading");

    try {
      const file = await normalizePartnerCameraPhoto(raw);
      const input = fileRef.current;
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
      setError("Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.");
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
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] text-center",
          compact ? "px-2 py-4" : "px-4 py-6"
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
        ) : isMobile ? (
          <Camera
            className={cn(compact ? "h-6 w-6" : "h-8 w-8", "text-text-secondary")}
            aria-hidden
          />
        ) : (
          <ImageIcon
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
            Foto hinzufügen
          </span>
        )}
        <div
          className={cn(
            "flex w-full gap-1.5",
            compact ? "flex-col" : "flex-row justify-center"
          )}
        >
          {isMobile ? (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={status === "uploading"}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border-default bg-white px-2 py-2 text-[11.5px] font-semibold text-text-primary hover:bg-[var(--p2-hover,#eef1ef)] disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Kamera
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={status === "uploading"}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border-default bg-white px-2 py-2 text-[11.5px] font-semibold text-text-primary hover:bg-[var(--p2-hover,#eef1ef)] disabled:opacity-50"
          >
            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {isMobile ? "Mediathek" : "Foto hochladen"}
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={() => undefined}
      />
      {isMobile ? (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onPick}
        />
      ) : null}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onPick}
      />
      {captureAt ? (
        <input type="hidden" name={captureAtName} value={captureAt} />
      ) : null}
      {error ? <p className="text-xs text-text-secondary">{error}</p> : null}
    </div>
  );
}
