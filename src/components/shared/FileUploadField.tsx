"use client";

import { cn } from "@/lib/utils";

type FileUploadFieldProps = {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
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
  onChange,
  className,
}: FileUploadFieldProps) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="text-text-tertiary">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-text-secondary">{hint}</span> : null}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="mt-2 w-full rounded-xl border border-dashed border-border-default bg-surface-card px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent"
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
      />
    </label>
  );
}
