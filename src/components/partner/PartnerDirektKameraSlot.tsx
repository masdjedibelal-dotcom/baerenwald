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
  className?: string;
  onCaptured?: (file: File, captureAtIso: string) => void;
};

/**
 * Direkt-Kamera laut Spec: capture=environment, kein Galerie-Default.
 * Ventil „Foto liegt schon vor?“ separat im Parent.
 */
export function PartnerDirektKameraSlot({
  label,
  required = true,
  name = "foto",
  className,
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
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
        {label}
        {required ? " · Pflicht" : ""}
      </p>
      <button
        type="button"
        onClick={openCamera}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/40 bg-accent-light/40 px-4 py-8 text-center transition-colors hover:bg-accent-light/70"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aufnahme"
            className="max-h-40 rounded-lg object-contain"
          />
        ) : (
          <Camera className="h-8 w-8 text-accent" aria-hidden />
        )}
        {status === "uploading" ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            wird vorbereitet…
          </span>
        ) : status === "done" ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <Check className="h-4 w-4" />
            Foto erfasst
            {captureAt
              ? ` · ${new Date(captureAt).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </span>
        ) : (
          <span className="text-sm font-semibold text-accent">Kamera öffnen</span>
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
        <input type="hidden" name="captureAt" value={captureAt} />
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
