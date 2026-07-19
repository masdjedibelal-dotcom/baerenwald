"use client";

import { cn } from "@/lib/utils";

type FileUploadFieldProps = {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Optional: Dateiname der gewählten Datei anzeigen */
  selectedName?: string | null;
  onChange: (files: File[]) => void;
  className?: string;
};

/** Datei-Upload mit Galerie/Kamera auf Mobilgeräten (`accept="image/*"`). */
export function FileUploadField({
  label,
  hint,
  accept,
  multiple,
  disabled,
  selectedName,
  onChange,
  className,
}: FileUploadFieldProps) {
  return (
    <label className={cn("block portal-text-body", className)}>
      <span className="text-text-tertiary">{label}</span>
      {hint ? <span className="mt-0.5 block portal-text-meta text-text-secondary">{hint}</span> : null}
      {selectedName ? (
        <span className="portal-text-meta mt-0.5 block font-medium text-text-primary">
          Ausgewählt: {selectedName}
        </span>
      ) : null}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="portal-text-body mt-2 w-full rounded-xl border border-dashed border-border-default bg-surface-card px-3 py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent"
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
    </label>
  );
}
