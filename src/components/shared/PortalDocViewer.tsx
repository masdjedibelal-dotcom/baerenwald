"use client";

import { useCallback, useEffect, useId, useState, type MouseEvent } from "react";

import { PortalDocPdfCanvas } from "@/components/shared/PortalDocPdfCanvas";
import {
  downloadPortalBlob,
  fetchPortalDocBlob,
  normalizePortalDocUrl,
  portalDocBadgeLabel,
  portalDocDownloadName,
  portalDocMetaLine,
  portalDocTitle,
  resolvePortalDocKind,
  type PortalDocView,
} from "@/lib/portal2/doc-viewer";
import { cn } from "@/lib/utils";

export type PortalDocViewerProps = {
  doc: PortalDocView;
  onClose: () => void;
};

/**
 * Vollbild-Vorschau in der PWA: PDF/Bild im Overlay, Schließen oben.
 * PDFs per PDF.js (Canvas) — kein System-Download, kein Verlassen der App.
 */
export function PortalDocViewer({ doc, onClose }: PortalDocViewerProps) {
  const titleId = useId();
  const kind = resolvePortalDocKind(doc);
  const url = normalizePortalDocUrl(doc.url);
  const title = portalDocTitle(doc.name);
  const meta = portalDocMetaLine(doc, kind);
  const badge = portalDocBadgeLabel(kind);
  const downloadName = portalDocDownloadName(doc.name, kind);

  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(kind === "pdf");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    kind === "pdf" ? null : url
  );
  const [busyDownload, setBusyDownload] = useState(false);

  useEffect(() => {
    setLoadError(false);
    setBlob(null);
    setBusyDownload(false);

    if (kind !== "pdf") {
      setLoading(false);
      setPreviewUrl(url);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setPreviewUrl(null);

    void (async () => {
      try {
        const next = await fetchPortalDocBlob(url);
        if (cancelled) return;
        const typed =
          next.type === "application/pdf"
            ? next
            : new Blob([next], { type: "application/pdf" });
        setBlob(typed);
        objectUrl = URL.createObjectURL(typed);
        setPreviewUrl(objectUrl);
        setLoadError(false);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setPreviewUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, url]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const ensureBlob = useCallback(async (): Promise<Blob> => {
    if (blob) return blob;
    const next = await fetchPortalDocBlob(url);
    setBlob(next);
    return next;
  }, [blob, url]);

  const onDownload = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setBusyDownload(true);
      try {
        const file = await ensureBlob();
        downloadPortalBlob(file, downloadName);
      } catch {
        setLoadError(true);
      } finally {
        setBusyDownload(false);
      }
    },
    [downloadName, ensureBlob]
  );

  const onPdfRenderError = useCallback(() => setLoadError(true), []);

  const showPdfPreview = kind === "pdf" && !loadError && Boolean(previewUrl);

  return (
    <div
      className="portal-doc-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="portal-doc-viewer-bar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="portal-doc-viewer-close"
          aria-label="Schließen"
          onClick={onClose}
        >
          ×
        </button>
        <div
          className={cn(
            "portal-doc-viewer-badge",
            kind === "pdf" && "portal-doc-viewer-badge--pdf",
            kind === "image" && "portal-doc-viewer-badge--img",
            kind === "other" && "portal-doc-viewer-badge--doc"
          )}
          aria-hidden
        >
          {badge}
        </div>
        <div className="portal-doc-viewer-bar-meta">
          <div id={titleId} className="portal-doc-viewer-bar-name">
            {doc.name}
          </div>
          <div className="portal-doc-viewer-bar-sub">
            {meta}
            {kind === "pdf" ? " · Vorschau" : null}
          </div>
        </div>
        <button
          type="button"
          className="portal-doc-viewer-download"
          onClick={onDownload}
          disabled={busyDownload || loading}
          aria-label="Herunterladen"
          title="Herunterladen"
        >
          {busyDownload ? "…" : "↓"}
        </button>
      </div>

      <div className="portal-doc-viewer-body" onClick={onClose}>
        <div
          className={cn(
            "portal-doc-viewer-stage",
            kind === "image" && "portal-doc-viewer-stage--image",
            kind === "pdf" && "portal-doc-viewer-stage--pdf"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                Vorschau wird geladen…
              </p>
            </div>
          ) : loadError ? (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                Vorschau nicht verfügbar. Du kannst die Datei speichern oder
                schließen.
              </p>
              <div className="portal-doc-viewer-fallback-actions">
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn"
                  onClick={onDownload}
                  disabled={busyDownload}
                >
                  {busyDownload ? "…" : "↓ Speichern"}
                </button>
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn portal-doc-viewer-fallback-btn--ghost"
                  onClick={onClose}
                >
                  Schließen
                </button>
              </div>
            </div>
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed/storage URLs
            <img
              src={previewUrl ?? url}
              alt={title}
              className="portal-doc-viewer-img"
              onError={() => setLoadError(true)}
            />
          ) : showPdfPreview ? (
            <PortalDocPdfCanvas
              src={previewUrl!}
              title={title}
              className="portal-doc-viewer-pdf-pages"
              onError={onPdfRenderError}
            />
          ) : (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                Für diesen Dateityp gibt es keine Inline-Vorschau.
              </p>
              <div className="portal-doc-viewer-fallback-actions">
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn"
                  onClick={onDownload}
                  disabled={busyDownload}
                >
                  ↓ Speichern
                </button>
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn portal-doc-viewer-fallback-btn--ghost"
                  onClick={onClose}
                >
                  Schließen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Uncontrolled Hülle für Provider. */
export function PortalDocViewerHost({
  doc,
  onClose,
}: {
  doc: PortalDocView | null;
  onClose: () => void;
}) {
  const close = useCallback(() => onClose(), [onClose]);
  if (!doc) return null;
  return <PortalDocViewer doc={doc} onClose={close} />;
}
