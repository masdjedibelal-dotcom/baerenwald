"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.75
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          if (blob.size < file.size) {
            resolve(
              new File([blob], file.name, {
                type: "image/jpeg",
              })
            );
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export interface PhotoUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
  /** Roter Rahmen / Hintergrund (z. B. Validierungsfehler) */
  uploadHasError?: boolean;
  /** Überschreibt den Standard-Button-Titel */
  buttonTitle?: string;
  /** Überschreibt den Hinweis unter dem Titel */
  buttonHint?: string;
}

export function PhotoUpload({
  files,
  onChange,
  maxFiles = 6,
  className,
  uploadHasError = false,
  buttonTitle = "Fotos hochladen (optional)",
  buttonHint,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState("");
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readPreview = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === "string") {
        setPreviews((p) => ({ ...p, [`${file.name}-${file.size}`]: res }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const showCompressionNotice = useCallback((savedBytes: number) => {
    if (savedBytes <= 100 * 1024) return;
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    const mb = savedBytes / (1024 * 1024);
    const text =
      mb >= 0.1
        ? `Fotos optimiert — ${mb.toLocaleString("de-DE", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} MB gespart`
        : `Fotos optimiert — ${Math.round(savedBytes / 1024)} KB gespart`;
    setCompressionNotice(text);
    noticeTimerRef.current = setTimeout(() => {
      setCompressionNotice("");
      noticeTimerRef.current = null;
    }, 5000);
  }, []);

  const processIncomingFiles = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return;

      setUploadError("");
      setIsCompressing(true);
      const compressed = await Promise.all(
        incoming.map((file) => compressImage(file))
      );
      setIsCompressing(false);

      let savedImages = 0;
      for (let i = 0; i < incoming.length; i++) {
        const raw = incoming[i];
        if (!raw.type.startsWith("image/")) continue;
        savedImages += Math.max(0, raw.size - compressed[i].size);
      }
      if (savedImages > 100 * 1024) {
        showCompressionNotice(savedImages);
      }

      for (const file of compressed) {
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(
            `"${file.name}" ist zu groß (max. 10 MB pro Datei).`
          );
          return;
        }
      }

      const next: File[] = [...files];
      const added: File[] = [];
      for (const f of compressed) {
        if (!f.type.startsWith("image/")) continue;
        if (next.length >= maxFiles) break;
        const dup = next.some((x) => x.name === f.name && x.size === f.size);
        if (!dup) {
          next.push(f);
          added.push(f);
        }
      }

      const totalSize = next.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        setUploadError(
          "Gesamtgröße überschreitet 30 MB. Bitte weniger oder kleinere Dateien hochladen."
        );
        return;
      }

      setUploadError("");
      for (const f of added) {
        readPreview(f);
      }
      onChange(next);
    },
    [files, maxFiles, onChange, readPreview, showCompressionNotice]
  );

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    void processIncomingFiles(list);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    void processIncomingFiles(list);
  };

  const removeAt = (index: number) => {
    const f = files[index];
    onChange(files.filter((_, i) => i !== index));
    setUploadError("");
    if (f) {
      const key = `${f.name}-${f.size}`;
      setPreviews((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className={cn(className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onInput}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "photo-upload-area relative w-full cursor-pointer rounded-xl border-2 border-dashed border-border-default p-6 text-center transition-colors hover:border-text-tertiary",
          dragOver && "border-funnel-accent bg-funnel-accent-hover",
          hasFiles && !uploadHasError && "border-funnel-accent bg-funnel-accent-hover",
          uploadHasError && "photo-upload-error"
        )}
      >
        <div className="mx-auto mb-2 text-text-tertiary" aria-hidden>
          <svg
            className="mx-auto size-10"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
            <path
              d="M21 19l-5-5-4 4-3-3-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-text-primary">{buttonTitle}</p>
        <p className="mt-1 text-xs text-text-tertiary">
          {buttonHint ??
            `Hilft beim Vor-Ort-Termin · max. ${maxFiles} Fotos · je max. 10 MB, gesamt max. 30 MB`}
        </p>
      </button>
      {isCompressing ? (
        <p className="photo-compressing">
          <span className="btn-spinner btn-spinner--dark" aria-hidden />
          Fotos werden optimiert…
        </p>
      ) : null}
      {compressionNotice ? (
        <p className="photo-compressing photo-compressing--notice">
          {compressionNotice}
        </p>
      ) : null}
      {uploadError ? (
        <p className="field-error" role="alert">
          {uploadError}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => {
            const key = `${f.name}-${f.size}`;
            const src = previews[key];
            return (
              <li key={key} className="relative">
                <div className="size-16 overflow-hidden rounded-lg border border-border-default bg-muted">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-text-tertiary">
                      …
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-funnel-accent text-xs text-white"
                  aria-label="Entfernen"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
