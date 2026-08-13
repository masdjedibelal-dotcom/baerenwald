"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

type FileUploadFieldProps = {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Optional: Dateiname der gewählten Datei anzeigen */
  selectedName?: string | null;
  /** Gewählte Datei — bei Bildern Vorschau im Feld */
  selectedFile?: File | null;
  onChange: (files: File[]) => void;
  className?: string;
  /** Kompakte Dropzone (z. B. Logo, Inline-Slots). */
  size?: "default" | "compact";
};

function isImageFile(file: File | null | undefined): boolean {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

/** Datei-Upload als Dropzone — ohne natives „Dateien auswählen“. */
export function FileUploadField({
  label,
  hint,
  accept,
  multiple,
  disabled,
  selectedName,
  selectedFile,
  onChange,
  className,
  size = "default",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const compact = size === "compact";
  const displayName = selectedName ?? selectedFile?.name ?? null;
  const showImagePreview = isImageFile(selectedFile);

  useEffect(() => {
    if (!selectedFile || !isImageFile(selectedFile)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onChange(files);
  }

  return (
    <div className={cn("block portal-text-body", className)}>
      <span className="text-text-tertiary">{label}</span>
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
          "mt-2 flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "gap-1 px-3 py-4" : "gap-1.5 px-4 py-7",
          showImagePreview && previewUrl && "py-3",
          dragOver
            ? "border-accent bg-accent-light/40"
            : "border-border-default bg-[var(--p2-selected,#f0f2f0)] hover:bg-[var(--p2-hover,#eef1ef)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {showImagePreview && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale Blob-Vorschau
          <img
            src={previewUrl}
            alt=""
            className={cn(
              "w-full rounded-lg object-cover",
              compact ? "max-h-28" : "max-h-44"
            )}
          />
        ) : displayName && !showImagePreview ? (
          <FileText
            className={cn(
              "text-text-secondary",
              compact ? "h-5 w-5" : "h-6 w-6"
            )}
            aria-hidden
          />
        ) : (
          <Upload
            className={cn(
              "text-text-secondary",
              compact ? "h-5 w-5" : "h-6 w-6"
            )}
            aria-hidden
          />
        )}
        <span
          className={cn(
            "font-semibold text-text-primary",
            compact ? "text-[12.5px]" : "text-[13.5px]"
          )}
        >
          {displayName
            ? "Andere Datei wählen"
            : compact
              ? "Datei wählen oder ablegen"
              : "Tippen oder Datei hier ablegen"}
        </span>
        {displayName ? (
          <span className="portal-text-meta max-w-full truncate font-medium text-text-primary">
            {displayName}
          </span>
        ) : (
          <span className="portal-text-meta text-text-tertiary">
            {hint?.trim() || "PDF, Foto oder Dokument"}
          </span>
        )}
      </button>
    </div>
  );
}
