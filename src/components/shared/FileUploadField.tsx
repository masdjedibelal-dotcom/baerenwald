"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

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
  /** Kompakte Dropzone (z. B. Logo, Inline-Slots). */
  size?: "default" | "compact";
};

/** Datei-Upload als Dropzone — ohne natives „Dateien auswählen“. */
export function FileUploadField({
  label,
  hint,
  accept,
  multiple,
  disabled,
  selectedName,
  onChange,
  className,
  size = "default",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const compact = size === "compact";

  function takeFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onChange(files);
  }

  return (
    <div className={cn("block portal-text-body", className)}>
      <span className="text-text-tertiary">{label}</span>
      {hint ? (
        <span className="mt-0.5 block portal-text-meta text-text-secondary">
          {hint}
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          takeFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mt-2 flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border-default bg-surface-card text-center transition-colors",
          compact ? "px-3 py-3" : "gap-1.5 px-3 py-5",
          dragOver && "border-accent bg-accent-light/30",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Upload
          className={cn("text-text-tertiary", compact ? "h-4 w-4" : "h-5 w-5")}
          aria-hidden
        />
        <span
          className={cn(
            "font-semibold text-text-primary",
            compact ? "text-[12.5px]" : "text-[13px]"
          )}
        >
          {selectedName
            ? "Andere Datei wählen"
            : compact
              ? "Datei wählen oder ablegen"
              : "Tippen oder Datei hier ablegen"}
        </span>
        {selectedName ? (
          <span className="portal-text-meta font-medium text-text-primary">
            Ausgewählt: {selectedName}
          </span>
        ) : null}
      </button>
    </div>
  );
}
