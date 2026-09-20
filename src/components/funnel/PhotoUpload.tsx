"use client";
import { MockIconSvg } from "@/components/shared/mock-icon-svgs";

import { useCallback, useRef, useState } from "react";

import { optimizeImageForUpload } from "@/lib/media/optimize-image-for-upload";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

const UPLOAD_ACCEPT =
  "image/*,video/*,application/pdf,.pdf,.doc,.docx,.jpg,.jpeg,.png,.heic";

function isAcceptedUploadFile(file: File): boolean {
  const t = file.type;
  if (t.startsWith("image/") || t.startsWith("video/")) return true;
  if (t === "application/pdf") return true;
  if (t === "application/msword") return true;
  if (
    t ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf") || n.endsWith(".doc") || n.endsWith(".docx"))
    return true;
  if (/\.(jpe?g|png|heic|heif)$/.test(n)) return true;
  return false;
}

type FileProgress = {
  name: string;
  status: "pending" | "compressing" | "done" | "error";
  error?: string;
  raw?: File;
};

async function compressImage(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") &&
    !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name)
  ) {
    return file;
  }
  return optimizeImageForUpload(file, { maxEdge: 2000 });
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
  /** Zusatz-Hinweis zu günstigeren Fremdangeboten (unter dem Upload-Bereich) */
  showCompareOfferHint?: boolean;
  /**
   * Optional: 1–n Beispielbilder + Tipps unter dem Upload
   * (Melde-Funnel, problemabhängig).
   */
  examples?: Array<{
    src: string;
    alt: string;
    tip: string;
    label?: string;
  }> | null;
  /** @deprecated nutze `examples` */
  example?: {
    src: string;
    alt: string;
    tip: string;
    label?: string;
  } | null;
}

export function PhotoUpload({
  files,
  onChange,
  maxFiles = 6,
  className,
  uploadHasError = false,
  buttonTitle = "Fotos oder Vergleichsangebote hochladen",
  buttonHint =
    "Projektfotos, Skizzen oder bestehende Angebote — damit wir Ihr Vorhaben vorab gut einordnen und uns vorbereiten können",
  showCompareOfferHint = false,
  examples = null,
  example = null,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState("");
  const [progress, setProgress] = useState<FileProgress[]>([]);
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
      setProgress(
        incoming.map((f) => ({
          name: f.name,
          status: "pending" as const,
          raw: f,
        }))
      );

      const compressed: File[] = [];
      let savedImages = 0;

      for (const raw of incoming) {
        setProgress((prev) =>
          prev.map((p) =>
            p.name === raw.name ? { ...p, status: "compressing", raw } : p
          )
        );
        try {
          const out = await compressImage(raw);
          if (raw.type.startsWith("image/") && out.type.startsWith("image/")) {
            savedImages += Math.max(0, raw.size - out.size);
          }
          compressed.push(out);
          setProgress((prev) =>
            prev.map((p) =>
              p.name === raw.name ? { ...p, status: "done" } : p
            )
          );
        } catch {
          setProgress((prev) =>
            prev.map((p) =>
              p.name === raw.name
                ? {
                    ...p,
                    status: "error",
                    error: "Abbruch — erneut versuchen",
                    raw,
                  }
                : p
            )
          );
        }
      }

      setIsCompressing(false);
      if (savedImages > 100 * 1024) {
        showCompressionNotice(savedImages);
      }

      for (const file of compressed) {
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(
            `"${file.name}" ist zu groß (max. 8 MB).`
          );
          return;
        }
      }

      const next: File[] = [...files];
      const added: File[] = [];
      for (const f of compressed) {
        if (!isAcceptedUploadFile(f)) continue;
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
        if (f.type.startsWith("image/")) readPreview(f);
      }
      onChange(next);
    },
    [files, maxFiles, onChange, readPreview, showCompressionNotice]
  );

  const retryFailed = useCallback(() => {
    const failed = progress
      .filter((p) => p.status === "error" && p.raw)
      .map((p) => p.raw!);
    if (!failed.length) return;
    void processIncomingFiles(failed);
  }, [processIncomingFiles, progress]);

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
  const failedCount = progress.filter((p) => p.status === "error").length;
  const doneCount = progress.filter((p) => p.status === "done").length;

  return (
    <div className={cn(className)}>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
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
          "photo-upload-area relative w-full cursor-pointer rounded-sheet border-2 border-dashed border-border-default p-6 text-center transition-colors hover:border-text-tertiary",
          dragOver && "border-funnel-accent bg-funnel-accent-hover",
          hasFiles && !uploadHasError && "border-funnel-accent bg-funnel-accent-hover",
          uploadHasError && "photo-upload-error"
        )}
      >
        <div className="mx-auto mb-2 text-text-tertiary" aria-hidden>
          <MockIconSvg
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
          </MockIconSvg>
        </div>
        <p className="text-sm font-medium text-text-primary">{buttonTitle}</p>
        <p className="mt-1 text-xs text-text-tertiary">{buttonHint}</p>
        <p className="mt-0.5 text-fs-caption text-text-tertiary">
          Max. {maxFiles} Dateien · je max. 8 MB, gesamt max. 30 MB
        </p>
      </button>
      {showCompareOfferHint ? (
        <p className="upload-hint-sub">
          Sie haben ein günstigeres Angebot? Einfach hier hochladen — wir schauen
          es uns an.
        </p>
      ) : null}
      {isCompressing ? (
        <p className="photo-compressing">
          <span className="btn-spinner btn-spinner--dark" aria-hidden />
          {progress.length > 0
            ? `Foto ${Math.min(doneCount + 1, progress.length)}/${progress.length} wird optimiert…`
            : "Fotos werden optimiert…"}
        </p>
      ) : null}
      {progress.length > 0 && !isCompressing ? (
        <ul className="mt-2 space-y-1 text-fs-caption text-text-secondary">
          {progress.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{p.name}</span>
              <span>{p.status === "done" ? "✓" : p.status === "error" ? "Abbruch" : "–"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {failedCount > 0 ? (
        <button
          type="button"
          className="mt-2 min-h-11 text-sm font-semibold text-funnel-accent underline-offset-2 hover:underline"
          onClick={retryFailed}
        >
          Erneut versuchen ({failedCount})
        </button>
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
                <div className="size-16 overflow-hidden rounded-card border border-border-default bg-muted">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-fs-caption text-text-tertiary">
                      …
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-pill bg-funnel-accent text-xs text-white"
                  aria-label="Entfernen"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {(() => {
        const list =
          examples && examples.length > 0
            ? examples
            : example
              ? [example]
              : [];
        if (!list.length) return null;
        return (
          <div
            className={cn(
              "mt-3 grid gap-2",
              list.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
            )}
          >
            {list.map((ex) => (
              <figure
                key={`${ex.src}-${ex.label ?? ""}`}
                className="photo-upload-example overflow-hidden rounded-sheet border border-border-default bg-muted/40"
              >
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ex.src}
                    alt={ex.alt}
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-field bg-black/55 px-2 py-0.5 text-fs-caption font-semibold tracking-wide text-white">
                    So fotografieren
                    {ex.label ? ` · ${ex.label}` : ""}
                  </span>
                </div>
                <figcaption className="px-3 py-2.5 text-fs-meta leading-snug text-text-secondary">
                  {ex.tip}
                </figcaption>
              </figure>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
