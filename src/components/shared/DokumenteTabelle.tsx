"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, Upload } from "lucide-react";

import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import { useOptionalPortalDocViewer } from "@/components/shared/PortalDocViewerContext";
import { detectPortalDocKind } from "@/lib/portal2/doc-viewer";
import { cn } from "@/lib/utils";

export type DokumentZeile = {
  id: string;
  datum?: string | null;
  name: string;
  href?: string;
  /** Optional Meta für docViewer (z. B. „PDF · 214 KB“) */
  meta?: string | null;
};

export type DokumenteTabelleUpload = {
  accept: string;
  multiple?: boolean;
  hint?: string;
  disabled?: boolean;
  selectedLabel?: string | null;
  error?: string | null;
  submitting?: boolean;
  onFiles: (files: File[]) => void;
  onSubmit?: () => void;
  submitLabel?: string;
};

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) || url.startsWith("/") || url.startsWith("blob:")
    ? url
    : `https://${url}`;
}

function UploadZone({
  upload,
  children,
  className,
}: {
  upload: DokumenteTabelleUpload;
  children: ReactNode;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || upload.disabled) return;
    const files = Array.from(list);
    if (files.length) upload.onFiles(files);
  }

  return (
    <div
      role="button"
      tabIndex={upload.disabled ? -1 : 0}
      className={cn(
        "cursor-pointer outline-none transition-colors",
        dragOver && "bg-accent-light/25",
        upload.disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onClick={() => {
        if (!upload.disabled) inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (upload.disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!upload.disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        takeFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={upload.accept}
        multiple={upload.multiple}
        disabled={upload.disabled}
        className="sr-only"
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

function DocActions({
  doc,
  onOpen,
}: {
  doc: DokumentZeile;
  onOpen: (doc: DokumentZeile) => void;
}) {
  if (!doc.href?.trim()) {
    return <span className="portal-text-meta text-text-tertiary">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onOpen(doc)}
        className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-[#c62828] transition-colors hover:bg-red-50"
        aria-label={`${doc.name} ansehen`}
      >
        <PdfFileIcon className="h-5 w-5" />
      </button>
      <a
        href={normalizeHref(doc.href)}
        download
        className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-text-secondary transition-colors hover:bg-muted/40"
        aria-label={`${doc.name} herunterladen`}
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

function UploadStrip({ upload }: { upload: DokumenteTabelleUpload }) {
  return (
    <UploadZone
      upload={upload}
      className="rounded-xl border border-dashed border-border-light bg-muted/10 px-3 py-3 sm:rounded-none sm:border-x-0 sm:border-b-0 sm:border-t"
    >
      <div className="flex items-center gap-2 text-text-secondary">
        <Upload className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="portal-text-body font-medium text-text-primary">
            Weitere Dokumente hinzufügen
          </p>
          {upload.hint ? (
            <p className="portal-text-meta text-text-tertiary">{upload.hint}</p>
          ) : (
            <p className="portal-text-meta text-text-tertiary">
              Tippen oder Datei hier ablegen
            </p>
          )}
        </div>
      </div>
    </UploadZone>
  );
}

function UploadFooter({ upload }: { upload: DokumenteTabelleUpload }) {
  if (!(upload.selectedLabel || upload.error || upload.onSubmit)) return null;
  return (
    <div
      className="space-y-2 rounded-xl border border-border-light bg-muted/15 px-3 py-3 sm:rounded-none sm:border-x-0 sm:border-b-0 sm:border-t"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {upload.selectedLabel ? (
        <p className="portal-text-meta font-medium text-text-primary">
          Ausgewählt: {upload.selectedLabel}
        </p>
      ) : null}
      {upload.error ? (
        <p className="portal-text-body text-red-700" role="alert">
          {upload.error}
        </p>
      ) : null}
      {upload.selectedLabel && upload.onSubmit ? (
        <button
          type="button"
          disabled={upload.disabled || upload.submitting}
          onClick={() => upload.onSubmit?.()}
          className="btn-pill-outline portal-btn"
        >
          {upload.submitting
            ? "Wird hochgeladen…"
            : upload.submitLabel ?? "Hochladen"}
        </button>
      ) : null}
    </div>
  );
}

export function DokumenteTabelle({
  dokumente,
  heading = "Dokumente",
  emptyText = "Noch keine Dokumente.",
  className,
  upload,
}: {
  dokumente: DokumentZeile[];
  heading?: string;
  emptyText?: string;
  className?: string;
  /** Upload direkt im Dokumente-Feld (kein separates Datei-Input darunter). */
  upload?: DokumenteTabelleUpload;
}) {
  const docViewer = useOptionalPortalDocViewer();

  function openOrFallback(doc: DokumentZeile) {
    const href = doc.href?.trim();
    if (!href) return;
    const url = normalizeHref(href);
    if (docViewer) {
      const fromName = detectPortalDocKind(doc.name);
      const kind =
        fromName !== "other" ? fromName : detectPortalDocKind(url);
      docViewer.openDoc({
        name: doc.name,
        meta: doc.meta?.trim() || undefined,
        url,
        kind,
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className={cn("space-y-2.5 border-t border-border-light pt-5", className)}>
      {heading?.trim() ? (
        <h4 className="portal-text-label text-text-tertiary">{heading}</h4>
      ) : null}

      {dokumente.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-dashed border-border-light">
          {upload ? (
            <UploadZone upload={upload} className="bg-muted/20 px-3 py-8 text-center">
              <Upload
                className="mx-auto mb-2 h-6 w-6 text-text-tertiary"
                aria-hidden
              />
              <p className="portal-text-body font-medium text-text-primary">
                {emptyText}
              </p>
              <p className="portal-text-meta mt-1 text-text-secondary">
                Tippen oder Datei hier ablegen
              </p>
              {upload.hint ? (
                <p className="portal-text-meta mt-1 text-text-tertiary">
                  {upload.hint}
                </p>
              ) : null}
            </UploadZone>
          ) : (
            <p className="portal-text-body bg-muted/20 px-3 py-5 text-center text-text-secondary">
              {emptyText}
            </p>
          )}
          {upload ? <UploadFooter upload={upload} /> : null}
        </div>
      ) : (
        <>
          {/* Mobil: Cards */}
          <div className="space-y-2.5 sm:hidden">
            {dokumente.map((doc) => {
              const datum = fmtDatum(doc.datum);
              return (
                <article
                  key={doc.id}
                  className="rounded-xl border border-border-light bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]"
                >
                  <div className="min-w-0">
                    {doc.href?.trim() ? (
                      <button
                        type="button"
                        className="line-clamp-2 text-left text-[14px] font-semibold leading-snug text-text-primary hover:underline"
                        onClick={() => openOrFallback(doc)}
                      >
                        {doc.name}
                      </button>
                    ) : (
                      <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-text-primary">
                        {doc.name}
                      </p>
                    )}
                    {doc.meta?.trim() ? (
                      <p className="portal-text-meta mt-1 text-text-secondary">
                        {doc.meta.trim()}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-light pt-3">
                    <p className="portal-text-meta tabular-nums text-text-tertiary">
                      {datum !== "—" ? `Datum · ${datum}` : "Kein Datum"}
                    </p>
                    <DocActions doc={doc} onOpen={openOrFallback} />
                  </div>
                </article>
              );
            })}
            {upload ? (
              <div className="space-y-2">
                <UploadStrip upload={upload} />
                <UploadFooter upload={upload} />
              </div>
            ) : null}
          </div>

          {/* Desktop: Tabelle */}
          <div className="hidden overflow-hidden rounded-xl border border-border-light sm:block">
            <table className="portal-text-body w-full">
              <thead>
                <tr className="portal-text-meta border-b border-border-light bg-muted/30 text-left text-text-tertiary">
                  <th className="px-3 py-2.5 font-semibold">Datum</th>
                  <th className="px-3 py-2.5 font-semibold">Dateiname</th>
                  <th className="w-[5.5rem] px-2 py-2.5 text-right font-semibold">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {dokumente.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border-light last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
                      {fmtDatum(doc.datum)}
                    </td>
                    <td className="min-w-0 px-3 py-3 font-medium text-text-primary">
                      {doc.href?.trim() ? (
                        <button
                          type="button"
                          className="line-clamp-2 text-left hover:underline"
                          onClick={() => openOrFallback(doc)}
                        >
                          {doc.name}
                        </button>
                      ) : (
                        <span className="line-clamp-2">{doc.name}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <DocActions doc={doc} onOpen={openOrFallback} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upload ? <UploadStrip upload={upload} /> : null}
            {upload ? <UploadFooter upload={upload} /> : null}
          </div>
        </>
      )}
    </section>
  );
}

export function portalDokumenteToZeilen(
  docs: Array<{
    id: string;
    name: string;
    subtitle?: string;
    datum?: string;
    href?: string;
    meta?: string;
  }>
): DokumentZeile[] {
  return docs.map((d) => ({
    id: d.id,
    datum: d.datum,
    name: d.subtitle ? `${d.name} — ${d.subtitle}` : d.name,
    href: d.href?.trim() || undefined,
    meta: d.meta?.trim() || undefined,
  }));
}
