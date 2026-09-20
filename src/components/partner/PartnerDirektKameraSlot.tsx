"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useRef, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

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
 * Foto-Slot: ein Picker ohne HTML-`capture`, damit iOS/Android den
 * System-Dialog zeigen (Kamera / Mediathek / Dateien).
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
  const pickerRef = useRef<HTMLInputElement>(null);
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
      <p className="text-fs-caption font-semibold text-text-secondary">
        {label}
        {required ? (
          <span className="font-medium text-text-tertiary"> · Pflicht</span>
        ) : null}
      </p>
      <PortalButton
        variant="ghost"
        action={false}
        type="button"
        onClick={() => pickerRef.current?.click()}
        disabled={status === "uploading"}
        className={cn(
          "portal-file-upload w-full",
          compact && "portal-file-upload--compact",
          preview && "portal-file-upload--preview",
          "disabled:opacity-50"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aufnahme"
            className={cn(
              "w-full rounded-card object-contain",
              compact ? "max-h-28" : "max-h-44"
            )}
          />
        ) : (
          <PortalIcon n="photo" ctx="default" className="text-text-secondary" aria-hidden />
        )}
        {status === "uploading" ? (
          <span className="inline-flex items-center gap-1.5 text-fs-meta text-text-secondary">
            <PortalIcon n="loader" ctx="default" className="h-4 w-4 animate-spin" />
            wird vorbereitet…
          </span>
        ) : status === "done" ? (
          <span className="inline-flex items-center gap-1.5 text-fs-meta font-medium text-text-primary">
            <PortalIcon n="check" ctx="default" className="h-4 w-4" />
            Erfasst
          </span>
        ) : (
          <span className="text-fs-body font-semibold text-text-primary">
            {isMobile ? "Foto aufnehmen oder wählen" : "Foto hochladen"}
          </span>
        )}
      </PortalButton>
      <input
        ref={fileRef}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={() => undefined}
      />
      <input
        ref={pickerRef}
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
