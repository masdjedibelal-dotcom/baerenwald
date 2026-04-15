"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

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

  const mergeFiles = useCallback(
    (incoming: File[]) => {
      const next: File[] = [...files];
      for (const f of incoming) {
        if (f.size > MAX_BYTES) continue;
        if (next.length >= maxFiles) break;
        if (!f.type.startsWith("image/")) continue;
        const dup = next.some((x) => x.name === f.name && x.size === f.size);
        if (!dup) {
          next.push(f);
          readPreview(f);
        }
      }
      onChange(next);
    },
    [files, maxFiles, onChange, readPreview]
  );

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    mergeFiles(list);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    mergeFiles(list);
  };

  const removeAt = (index: number) => {
    const f = files[index];
    onChange(files.filter((_, i) => i !== index));
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
          dragOver && "border-funnel-accent bg-funnel-accent/[0.03]",
          hasFiles && !uploadHasError && "border-funnel-accent bg-funnel-accent/[0.03]",
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
            `Hilft beim Vor-Ort-Termin · max. ${maxFiles} Fotos`}
        </p>
      </button>
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
