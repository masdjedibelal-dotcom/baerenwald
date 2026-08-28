"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import { PortalDocOpenButton } from "@/components/shared/PortalDocOpenButton";
import { cn } from "@/lib/utils";

const ACTION_BTN =
  "portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white transition-colors";

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) || url.startsWith("/") || url.startsWith("blob:")
    ? url
    : `https://${url}`;
}

/** Datum + Status in einer Zeile (Mobil-Meta). */
export function PortalDokumentMetaLine({
  datum,
  status,
  extra,
}: {
  datum?: string | null;
  status?: ReactNode;
  extra?: ReactNode;
}) {
  const d = datum?.trim();
  const hasDatum = Boolean(d && d !== "—");
  if (!hasDatum && !status && !extra) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {hasDatum ? (
        <span className="portal-text-meta tabular-nums text-text-tertiary">
          {d}
        </span>
      ) : null}
      {hasDatum && status ? (
        <span className="portal-text-meta text-text-tertiary" aria-hidden>
          ·
        </span>
      ) : null}
      {status}
      {extra}
    </div>
  );
}

/**
 * Einheitliche Dokument-Aktionen (Ansehen / Download / Upload / Löschen).
 * Ohne href und ohne weitere Aktionen: nichts rendern (kein „—“).
 */
export function PortalDokumentActions({
  href,
  name,
  kannHochladen,
  kannLoeschen,
  loading,
  onUploadClick,
  onDelete,
  onOpen,
  className,
}: {
  href?: string | null;
  name: string;
  kannHochladen?: boolean;
  kannLoeschen?: boolean;
  loading?: boolean;
  onUploadClick?: () => void;
  onDelete?: () => void;
  /** Optional: eigenes Öffnen (z. B. DokumenteTabelle-Viewer). */
  onOpen?: () => void;
  className?: string;
}) {
  const url = href?.trim() ? normalizeHref(href.trim()) : "";
  const showOpen = Boolean(url);
  const showAnything = showOpen || kannHochladen || kannLoeschen;
  if (!showAnything) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showOpen ? (
        <>
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className={cn(ACTION_BTN, "text-[#c62828] hover:bg-red-50")}
              aria-label={`${name} ansehen`}
            >
              <PdfFileIcon className="h-5 w-5" />
            </button>
          ) : (
            <PortalDocOpenButton
              href={url}
              name={name}
              kind="pdf"
              className={cn(ACTION_BTN, "text-[#c62828] hover:bg-red-50")}
            >
              <PdfFileIcon className="h-5 w-5" />
              <span className="sr-only">{`${name} ansehen`}</span>
            </PortalDocOpenButton>
          )}
          <a
            href={url}
            download
            className={cn(
              ACTION_BTN,
              "text-text-secondary hover:bg-muted/40"
            )}
            aria-label={`${name} herunterladen`}
          >
            <Download className="h-4 w-4" />
          </a>
        </>
      ) : null}
      {kannHochladen && onUploadClick ? (
        <button
          type="button"
          disabled={loading}
          onClick={onUploadClick}
          className={cn(
            ACTION_BTN,
            "text-accent hover:bg-accent-light/30 disabled:opacity-50"
          )}
          aria-label={`${name} hochladen`}
        >
          <Upload className="h-4 w-4" />
        </button>
      ) : null}
      {kannLoeschen && onDelete ? (
        <button
          type="button"
          disabled={loading}
          onClick={onDelete}
          className={cn(
            ACTION_BTN,
            "text-red-700 hover:bg-red-50 disabled:opacity-50"
          )}
          aria-label={`${name} löschen`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

type UploadZoneProps = {
  label?: string;
  hint?: string;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  onClick?: () => void;
  className?: string;
  /** `stack` = Liste-Anhängen; `empty` = leere Liste. */
  variant?: "stack" | "empty";
};

/**
 * Kompakte Dokument-Dropzone — Stammunterlagen + Vorgangs-Dokumente.
 */
export function PortalDokumentUploadZone({
  label = "Dokument hochladen",
  hint = "PDF, JPG, PNG oder WebP",
  disabled,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  multiple,
  onFiles,
  onClick,
  className,
  variant = "stack",
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || disabled || !onFiles) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  }

  function activate() {
    if (disabled) return;
    if (onClick) {
      onClick();
      return;
    }
    inputRef.current?.click();
  }

  const stacked = variant === "stack";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      className={cn(
        "cursor-pointer outline-none transition-colors",
        stacked
          ? "flex items-center gap-2.5 rounded-xl border-2 border-dashed border-border-default bg-white px-3.5 py-3.5"
          : "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-default bg-white px-4 py-5 text-center",
        dragOver && "border-accent bg-accent-light/25",
        disabled && "cursor-not-allowed opacity-60",
        !disabled && "hover:bg-[var(--p2-hover,#eef1ef)]",
        className
      )}
      onClick={activate}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && onFiles) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        takeFiles(e.dataTransfer.files);
      }}
    >
      {onFiles ? (
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
      ) : null}
      <Upload
        className={cn(
          "shrink-0 text-text-secondary",
          stacked ? "h-5 w-5 text-accent" : "h-5 w-5"
        )}
        aria-hidden
      />
      <div className={cn(stacked ? "min-w-0 text-left" : undefined)}>
        <p className="text-[13.5px] font-semibold text-text-primary">{label}</p>
        {hint ? (
          <p className="portal-text-meta text-text-tertiary">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
