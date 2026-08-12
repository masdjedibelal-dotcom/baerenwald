"use client";

import { useCallback, useEffect, useId, useState, type MouseEvent } from "react";

import {
  downloadPortalBlob,
  fetchPortalDocBlob,
  normalizePortalDocUrl,
  portalDocBadgeLabel,
  portalDocDownloadName,
  portalDocMetaLine,
  portalDocTitle,
  resolvePortalDocKind,
  sharePortalBlob,
  shouldAvoidNativePdfNavigation,
  type PortalDocView,
} from "@/lib/portal2/doc-viewer";
import { cn } from "@/lib/utils";

export type PortalDocViewerProps = {
  doc: PortalDocView;
  onClose: () => void;
};

/**
 * Mock `docViewer()` — Vollbild-Overlay, dunkle Leiste, echte Preview.
 * PDF in PWA/iOS: kein natives Embed/`_blank` (sonst weg ohne Zurück) —
 * Blob laden, Overlay behalten, Download/Share.
 */
export function PortalDocViewer({ doc, onClose }: PortalDocViewerProps) {
  const titleId = useId();
  const kind = resolvePortalDocKind(doc);
  const url = normalizePortalDocUrl(doc.url);
  const title = portalDocTitle(doc.name);
  const meta = portalDocMetaLine(doc, kind);
  const badge = portalDocBadgeLabel(kind);
  const downloadName = portalDocDownloadName(doc.name, kind);
  const avoidNativePdf = kind === "pdf" && shouldAvoidNativePdfNavigation();

  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(kind === "pdf");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    kind === "pdf" ? null : url
  );
  const [busyAction, setBusyAction] = useState<"download" | "share" | null>(
    null
  );

  useEffect(() => {
    setLoadError(false);
    setBlob(null);
    setBusyAction(null);

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
        setBlob(next);
        objectUrl = URL.createObjectURL(next);
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
      setBusyAction("download");
      try {
        const file = await ensureBlob();
        downloadPortalBlob(file, downloadName);
      } catch {
        setLoadError(true);
      } finally {
        setBusyAction(null);
      }
    },
    [downloadName, ensureBlob]
  );

  const onShare = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setBusyAction("share");
      try {
        const file = await ensureBlob();
        const ok = await sharePortalBlob(file, downloadName);
        if (!ok) downloadPortalBlob(file, downloadName);
      } catch {
        setLoadError(true);
      } finally {
        setBusyAction(null);
      }
    },
    [downloadName, ensureBlob]
  );

  const showPdfSafeUi = kind === "pdf" && (avoidNativePdf || loadError);
  const showPdfIframe =
    kind === "pdf" && !avoidNativePdf && !loadError && Boolean(previewUrl);

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
            {kind === "pdf" && !avoidNativePdf ? " · Vorschau" : null}
          </div>
        </div>
        <button
          type="button"
          className="portal-doc-viewer-download"
          onClick={onDownload}
          disabled={busyAction != null}
        >
          {busyAction === "download" ? "…" : "↓ Herunterladen"}
        </button>
      </div>

      <div className="portal-doc-viewer-body" onClick={onClose}>
        <div
          className={cn(
            "portal-doc-viewer-stage",
            kind === "image" && "portal-doc-viewer-stage--image"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">Dokument wird geladen…</p>
            </div>
          ) : showPdfSafeUi ? (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                {loadError
                  ? "Vorschau nicht verfügbar. Du kannst die Datei speichern oder teilen — ohne die App zu verlassen."
                  : "In der App-Ansicht öffnen wir PDFs nicht systemweit (sonst fehlt Zurück). Speichern oder teilen — Schließen bleibt oben."}
              </p>
              <div className="portal-doc-viewer-fallback-actions">
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn"
                  onClick={onDownload}
                  disabled={busyAction != null}
                >
                  {busyAction === "download" ? "…" : "↓ Speichern"}
                </button>
                <button
                  type="button"
                  className="portal-doc-viewer-fallback-btn portal-doc-viewer-fallback-btn--ghost"
                  onClick={onShare}
                  disabled={busyAction != null}
                >
                  {busyAction === "share" ? "…" : "Teilen"}
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
          ) : showPdfIframe ? (
            <iframe
              title={title}
              src={previewUrl ?? undefined}
              className="portal-doc-viewer-iframe"
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
                  disabled={busyAction != null}
                >
                  ↓ Speichern
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
