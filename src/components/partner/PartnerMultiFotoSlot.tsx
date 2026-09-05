"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";

import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import { useImageFileDrop } from "@/hooks/useImageFileDrop";
import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
import { cn } from "@/lib/utils";

/** Analog CRM: bis 12 Fotos pro Eintrag. */
const MAX_FOTOS = 12;

export type PartnerMultiFotoSlotProps = {
  label?: string;
  required?: boolean;
  max?: number;
  className?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
};

/**
 * Foto-Zone: Klick + Drag-and-Drop, Mehrfachauswahl — analog CRM FotoDropZone.
 * Mobil: Kamera; Desktop: Mediathek / Ablegen.
 */
export function PartnerMultiFotoSlot({
  label = "Fotos",
  required = false,
  max = MAX_FOTOS,
  className,
  value,
  onChange,
  disabled = false,
}: PartnerMultiFotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsPortalMobile();
  const [internal, setInternal] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  const files = value ?? internal;
  const busy = disabled || status === "uploading";

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

  const addFiles = useCallback(
    async (incoming: File[]) => {
      if (!incoming.length || busy) return;
      const room = max - files.length;
      if (room <= 0) {
        setError(`Maximal ${max} Fotos.`);
        return;
      }
      const batch = incoming.slice(0, room);
      setError(null);
      setStatus("uploading");
      try {
        const added: File[] = [];
        for (const raw of batch) {
          try {
            added.push(await normalizePartnerCameraPhoto(raw));
          } catch {
            /* skip single bad file */
          }
        }
        if (!added.length) {
          setError(
            isMobile
              ? "Fotos konnten nicht verarbeitet werden. Bitte erneut aufnehmen."
              : "Fotos konnten nicht verarbeitet werden. Bitte erneut wählen."
          );
          return;
        }
        setFiles([...files, ...added]);
      } finally {
        setStatus("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, files, isMobile, max, onChange, value]
  );

  const { isDragging, dropProps } = useImageFileDrop({
    disabled: busy || files.length >= max,
    multiple: true,
    onFiles: (picked) => {
      void addFiles(picked);
    },
  });

  function openPicker() {
    if (files.length >= max || busy) return;
    inputRef.current?.click();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    void addFiles(Array.from(list));
  }

  function removeAt(i: number) {
    setFiles(files.filter((_, idx) => idx !== i));
  }

  const canAdd = files.length < max && !disabled;
  const Icon = isMobile ? Camera : ImageIcon;
  const ctaLabel = status === "uploading"
    ? "wird vorbereitet…"
    : isDragging
      ? "Fotos hier ablegen"
      : isMobile
        ? files.length
          ? "Weitere Fotos"
          : "Kamera öffnen"
        : files.length
          ? "Weitere Fotos tippen oder ablegen"
          : "Fotos tippen oder ablegen";

  // dropProps vor onClick: Klick öffnet Picker, Drop bleibt aktiv
  const zoneProps = {
    ...dropProps,
    onClick: openPicker,
    type: "button" as const,
    disabled: busy,
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[12px] font-semibold text-text-secondary">
        {label}
        {required ? (
          <span className="font-medium text-text-tertiary"> · Pflicht</span>
        ) : (
          <span className="font-medium text-text-tertiary">
            {" "}
            · bis {max} Fotos · Drag & Drop
          </span>
        )}
      </p>

      {canAdd ? (
        <button
          {...zoneProps}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors disabled:opacity-60",
            isDragging
              ? "border-[var(--p2-primary,#2E7D52)] bg-[var(--p2-primary-soft,#dce8e0)]"
              : "border-border-default bg-white hover:bg-[var(--p2-hover,#eef1ef)]"
          )}
        >
          {status === "uploading" ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              wird vorbereitet…
            </span>
          ) : (
            <>
              <Icon className="h-8 w-8 text-text-secondary" aria-hidden />
              <span className="text-[13px] font-semibold text-text-primary">
                {ctaLabel}
              </span>
              {!isMobile ? (
                <span className="text-[11.5px] text-text-tertiary">
                  Mehrere Dateien gleichzeitig möglich
                </span>
              ) : null}
            </>
          )}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        {...(isMobile ? { capture: "environment" as const } : {})}
        className="sr-only"
        disabled={busy}
        onChange={onPick}
      />

      {files.length > 0 ? (
        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
          role="list"
          aria-label={`Hochgeladene Fotos, ${files.length} von ${max}`}
        >
          {previews.map((url, i) => (
            <div
              key={`${url}-${i}`}
              role="listitem"
              className="relative aspect-square overflow-hidden rounded-lg border border-border-default bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white"
                aria-label={`Foto ${i + 1} entfernen`}
                disabled={busy}
                onClick={() => removeAt(i)}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
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
