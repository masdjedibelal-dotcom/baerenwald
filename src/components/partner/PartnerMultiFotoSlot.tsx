"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import { cn } from "@/lib/utils";

const MAX_FOTOS = 5;

export type PartnerMultiFotoSlotProps = {
  label?: string;
  required?: boolean;
  max?: number;
  className?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
};

/**
 * Kamera-Slot mit bis zu 5 Fotos — kleine Vorschau-Row darunter.
 */
export function PartnerMultiFotoSlot({
  label = "Ergebnis-Foto",
  required = false,
  max = MAX_FOTOS,
  className,
  value,
  onChange,
}: PartnerMultiFotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internal, setInternal] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  const files = value ?? internal;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [files]);

  function setFiles(next: File[]) {
    const clipped = next.slice(0, max);
    if (value === undefined) setInternal(clipped);
    onChange?.(clipped);
  }

  function openCamera() {
    if (files.length >= max) return;
    inputRef.current?.click();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    if (files.length >= max) {
      setError(`Maximal ${max} Fotos.`);
      return;
    }
    setError(null);
    setStatus("uploading");
    try {
      const file = await normalizePartnerCameraPhoto(raw);
      setFiles([...files, file]);
      setStatus("idle");
    } catch {
      setStatus("idle");
      setError("Foto konnte nicht verarbeitet werden. Bitte erneut aufnehmen.");
    }
  }

  function removeAt(i: number) {
    setFiles(files.filter((_, idx) => idx !== i));
  }

  const canAdd = files.length < max;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[12px] font-semibold text-text-secondary">
        {label}
        {required ? (
          <span className="font-medium text-text-tertiary"> · Pflicht</span>
        ) : (
          <span className="font-medium text-text-tertiary">
            {" "}
            · bis {max} Fotos
          </span>
        )}
      </p>

      {canAdd ? (
        <button
          type="button"
          onClick={openCamera}
          disabled={status === "uploading"}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] px-4 py-7 text-center transition-colors hover:bg-[var(--p2-hover,#eef1ef)] disabled:opacity-60"
        >
          {status === "uploading" ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              wird vorbereitet…
            </span>
          ) : (
            <>
              <Camera className="h-7 w-7 text-text-secondary" aria-hidden />
              <span className="text-[12px] font-semibold text-text-primary">
                Kamera öffnen
              </span>
            </>
          )}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onPick}
      />

      {files.length > 0 ? (
        <div
          className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1"
          role="list"
          aria-label={`Hochgeladene Fotos, ${files.length} von ${max}`}
        >
          {previews.map((url, i) => (
            <div
              key={`${url}-${i}`}
              role="listitem"
              className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-border-default bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white"
                aria-label={`Foto ${i + 1} entfernen`}
                onClick={() => removeAt(i)}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-text-secondary">{error}</p> : null}
    </div>
  );
}

export const PARTNER_MAX_ERGEBNIS_FOTOS = MAX_FOTOS;
