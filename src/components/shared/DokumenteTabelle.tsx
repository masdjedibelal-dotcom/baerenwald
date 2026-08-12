"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, Upload } from "lucide-react";

import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import { useOptionalPortalDocViewer } from "@/components/shared/PortalDocViewerContext";
import {
  detectPortalDocKind,
  shouldAvoidNativePdfNavigation,
} from "@/lib/portal2/doc-viewer";
import { cn } from "@/lib/utils";

export type DokumentZeile = {
  id: string;
  datum?: string | null;
  name: string;
  /** Beschreibung unter dem Titel */
  beschreibung?: string | null;
  href?: string;
  /** Zusatzinfo (z. B. „PDF · 214 KB“) */
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
        dragOver && "border-accent bg-accent-light/25",
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
    <>
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
    </>
  );
}

function UploadFooter({ upload }: { upload: DokumenteTabelleUpload }) {
  if (!(upload.selectedLabel || upload.error || upload.onSubmit)) return null;
  return (
    <div
      className="space-y-2 rounded-xl border border-border-default bg-muted/15 px-3.5 py-3"
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
    if (
      detectPortalDocKind(doc.name) === "pdf" ||
      detectPortalDocKind(url) === "pdf"
    ) {
      if (shouldAvoidNativePdfNavigation()) {
        void (async () => {
          try {
            const {
              fetchPortalDocBlob,
              downloadPortalBlob,
              portalDocDownloadName,
            } = await import("@/lib/portal2/doc-viewer");
            const blob = await fetchPortalDocBlob(url);
            downloadPortalBlob(blob, portalDocDownloadName(doc.name, "pdf"));
          } catch {
            /* ignore */
          }
        })();
        return;
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      className={cn("space-y-2.5 border-t border-border-light pt-5", className)}
    >
      {heading?.trim() ? (
        <h4 className="portal-text-section">{heading}</h4>
      ) : null}

      {dokumente.length === 0 ? (
        <div className="space-y-3">
          {upload ? (
            <UploadZone
              upload={upload}
              className="rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] px-4 py-8 text-center hover:bg-[var(--p2-hover,#eef1ef)]"
            >
              <Upload
                className="mx-auto mb-2 h-6 w-6 text-text-secondary"
                aria-hidden
              />
              <p className="portal-text-body font-semibold text-text-primary">
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
            <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/15 px-4 py-8 text-center text-text-secondary">
              {emptyText}
            </p>
          )}
          {upload ? <UploadFooter upload={upload} /> : null}
        </div>
      ) : (
        <div className="space-y-2.5">
          {dokumente.map((doc) => {
            const datum = fmtDatum(doc.datum);
            const description = doc.beschreibung?.trim() || null;
            const metaBits = [
              datum !== "—" ? `Datum · ${datum}` : null,
              doc.meta?.trim() || null,
            ].filter(Boolean) as string[];

            return (
              <PortalDokumentCard
                key={doc.id}
                title={doc.name}
                description={description}
                meta={
                  metaBits.length > 0 ? (
                    <>
                      {metaBits.map((bit) => (
                        <span
                          key={bit}
                          className="portal-text-meta text-text-tertiary"
                        >
                          {bit}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="portal-text-meta text-text-tertiary">
                      Kein Datum
                    </span>
                  )
                }
                actions={<DocActions doc={doc} onOpen={openOrFallback} />}
              />
            );
          })}

          {upload ? (
            <div className="space-y-2.5 pt-1">
              <UploadZone
                upload={upload}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] px-3.5 py-4 hover:bg-[var(--p2-hover,#eef1ef)]"
              >
                <Upload
                  className="h-5 w-5 shrink-0 text-accent"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="portal-text-body font-semibold text-text-primary">
                    Weitere Dokumente hinzufügen
                  </p>
                  <p className="portal-text-meta text-text-tertiary">
                    {upload.hint?.trim() || "Tippen oder Datei hier ablegen"}
                  </p>
                </div>
              </UploadZone>
              <UploadFooter upload={upload} />
            </div>
          ) : null}
        </div>
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
    name: d.name,
    beschreibung: d.subtitle?.trim() || undefined,
    href: d.href?.trim() || undefined,
    meta: d.meta?.trim() || undefined,
  }));
}
