"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

export interface PhotoUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
}

export function PhotoUpload({
  files,
  onChange,
  maxFiles = 6,
  className,
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
    <div className={cn("fade-in", className)}>
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
          "relative w-full rounded-[var(--r)] border-[1.5px] border-dashed border-[#e8e8e8] bg-[#fafafa] px-4 py-[22px] text-center transition-colors",
          dragOver && "border-funnel-accent bg-[#f8f8f8]",
          hasFiles && "border-funnel-accent bg-[#f8f8f8]"
        )}
      >
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#e8e8e8] text-text-primary">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
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
        <p className="mt-3 text-[13px] font-medium text-text-primary">
          Fotos hier ablegen oder klicken
        </p>
        <p className="mt-1 text-[11px] text-[#999]">
          Bis {maxFiles} Bilder, max. 10 MB je Datei
        </p>
        <span className="absolute right-3 top-3 rounded-full bg-funnel-accent px-2 py-0.5 text-[11px] font-medium text-white">
          {files.length}/{maxFiles}
        </span>
      </button>
      {files.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {files.map((f, i) => {
            const key = `${f.name}-${f.size}`;
            const src = previews[key];
            return (
              <li key={key} className="relative">
                <div className="size-16 overflow-hidden rounded-lg border border-[#e8e8e8] bg-muted">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-[#999]">
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
