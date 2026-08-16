"use client";

import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import {
  PortalDokumentActions,
  PortalDokumentMetaLine,
  PortalDokumentUploadZone,
} from "@/components/shared/PortalDokumentUi";
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
  /** Partner: Löschen erlauben (UI zeigt Trash). */
  canDelete?: boolean;
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

/**
 * Dokumentliste + optionale Upload-Zone — Partner/HV/Kunde Vorgänge & Stammunterlagen-Stil.
 */
export function DokumenteTabelle({
  dokumente,
  heading = "Dokumente",
  emptyText = "Noch keine Dokumente.",
  className,
  upload,
  onDeleteDoc,
}: {
  dokumente: DokumentZeile[];
  heading?: string;
  emptyText?: string;
  className?: string;
  /** Upload direkt im Dokumente-Feld (kein separates Datei-Input darunter). */
  upload?: DokumenteTabelleUpload;
  /** Optional: Löschen für Zeilen mit `canDelete`. */
  onDeleteDoc?: (doc: DokumentZeile) => void;
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

  const uploadZone = upload ? (
    <div className="space-y-2.5">
      <PortalDokumentUploadZone
        variant={dokumente.length === 0 ? "empty" : "stack"}
        label={
          dokumente.length === 0 ? emptyText : "Weitere Dokumente hinzufügen"
        }
        hint={
          upload.hint?.trim() ||
          (dokumente.length === 0
            ? "Tippen oder Datei hier ablegen"
            : "Tippen oder Datei hier ablegen")
        }
        disabled={upload.disabled}
        accept={upload.accept}
        multiple={upload.multiple}
        onFiles={upload.onFiles}
      />
      <UploadFooter upload={upload} />
    </div>
  ) : null;

  return (
    <section
      className={cn("space-y-2.5 border-t border-border-light pt-5", className)}
    >
      {heading?.trim() ? (
        <h4 className="portal-text-section">{heading.trim()}</h4>
      ) : null}

      {dokumente.length === 0 ? (
        uploadZone ?? (
          <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/15 px-4 py-5 text-center text-text-secondary">
            {emptyText}
          </p>
        )
      ) : (
        <div className="space-y-2.5">
          {dokumente.map((doc) => {
            const datum = fmtDatum(doc.datum);
            const description = doc.beschreibung?.trim() || null;

            return (
              <PortalDokumentCard
                key={doc.id}
                title={doc.name}
                description={description}
                meta={
                  <PortalDokumentMetaLine
                    datum={datum !== "—" ? datum : null}
                    extra={
                      doc.meta?.trim() ? (
                        <span className="portal-text-meta text-text-tertiary">
                          {datum !== "—" ? `· ${doc.meta.trim()}` : doc.meta.trim()}
                        </span>
                      ) : null
                    }
                  />
                }
                actions={
                  <PortalDokumentActions
                    href={doc.href}
                    name={doc.name}
                    kannLoeschen={Boolean(doc.canDelete && onDeleteDoc)}
                    onDelete={
                      onDeleteDoc ? () => onDeleteDoc(doc) : undefined
                    }
                    onOpen={() => openOrFallback(doc)}
                  />
                }
              />
            );
          })}

          {uploadZone}
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
