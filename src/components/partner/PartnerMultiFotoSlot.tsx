"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

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
 *
 * Mobil: bewusst OHNE `capture` — iOS/Android zeigen den System-Picker
 * (Foto aufnehmen / Mediathek / Dateien). `capture` + `multiple` bricht auf
 * Safari oft den Rückweg nach dem Foto.
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
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [failedBatch, setFailedBatch] = useState<File[]>([]);

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
      setFailedBatch([]);
      setStatus("uploading");
      try {
        const added: File[] = [];
        const failed: File[] = [];
        for (let i = 0; i < batch.length; i++) {
          const raw = batch[i];
          setProgressLabel(`Foto ${i + 1}/${batch.length}`);
          try {
            added.push(await normalizePartnerCameraPhoto(raw));
          } catch {
            failed.push(raw);
          }
        }
        setProgressLabel(null);
        if (failed.length) {
          setFailedBatch(failed);
          setError(
            isMobile
              ? `${failed.length} Foto(s) fehlgeschlagen — erneut versuchen.`
              : `${failed.length} Foto(s) fehlgeschlagen — erneut wählen oder versuchen.`
          );
        }
        if (!added.length && failed.length) {
          return;
        }
        if (added.length) {
          setFiles([...files, ...added]);
        }
      } finally {
        setStatus("idle");
        setProgressLabel(null);
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
    const ctaLabel = status === "uploading"
    ? progressLabel ?? "wird vorbereitet…"
    : isDragging
      ? "Fotos hier ablegen"
      : isMobile
        ? files.length
          ? "Weitere Fotos"
          : "Foto aufnehmen oder wählen"
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
      <p className="text-fs-caption font-semibold text-text-secondary">
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
        <PortalButton
          variant="ghost"
          action={false}
          {...zoneProps}
          className={cn(
            "portal-file-upload w-full",
            isDragging && "portal-file-upload--drag",
            "disabled:opacity-60"
          )}
        >
          {status === "uploading" ? (
            <span className="inline-flex items-center gap-1.5 text-fs-meta text-text-secondary">
              <PortalIcon n="loader" ctx="default" className="h-5 w-5 animate-spin" />
              {progressLabel ?? "wird vorbereitet…"}
            </span>
          ) : (
            <>
              <PortalIcon n="photo" ctx="muted" className="text-text-secondary" />
              <span className="text-fs-body font-semibold text-text-primary">
                {ctaLabel}
              </span>
              {!isMobile ? (
                <span className="portal-text-meta text-text-tertiary">
                  Mehrere Dateien gleichzeitig möglich
                </span>
              ) : null}
            </>
          )}
        </PortalButton>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy}
        onChange={onPick}
      />

      {files.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-fs-caption font-medium text-text-tertiary">
            Vorschau · {files.length}
            {max > 1 ? ` / ${max}` : ""} · wischen · × zum Entfernen
          </p>
          <div
            className="partner-foto-carousel flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] snap-x snap-mandatory"
            role="list"
            aria-label={`Hochgeladene Fotos, ${files.length} von ${max}`}
          >
            {previews.map((url, i) => (
              <div
                key={`${files[i]?.name ?? "foto"}-${i}-${files[i]?.size ?? 0}`}
                role="listitem"
                className="relative h-[4.75rem] w-[4.75rem] shrink-0 snap-start overflow-hidden rounded-sheet border border-border-default bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <PortalButton
                  variant="ghost"
                  type="button"
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-pill bg-black/65 text-white shadow-sm active:scale-95"
                  aria-label={`Foto ${i + 1} entfernen`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                >
                  <PortalIcon n="x" ctx="default" className="h-3.5 w-3.5" />
                </PortalButton>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-text-secondary">{error}</p> : null}
      {failedBatch.length > 0 && status === "idle" ? (
        <PortalButton
          variant="ghost"
          type="button"
          className="min-h-11 text-sm font-semibold text-[var(--p2-primary)]"
          onClick={() => void addFiles(failedBatch)}
        >
          Erneut versuchen ({failedBatch.length})
        </PortalButton>
      ) : null}
    </div>
  );
}

export const PARTNER_MAX_ERGEBNIS_FOTOS = MAX_FOTOS;
