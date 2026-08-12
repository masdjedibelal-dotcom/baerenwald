"use client";

import { useCallback, useEffect, useId, useState } from "react";

import {
  normalizePortalDocUrl,
  portalDocBadgeLabel,
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
 * Mock `docViewer()` — Vollbild-Overlay, dunkle Leiste, echte Preview.
 * Keine grauen Platzhalter-Linien (Attrappen-Verbot); PDF/Bild via URL.
 */
export function PortalDocViewer({ doc, onClose }: PortalDocViewerProps) {
  const titleId = useId();
  const kind = resolvePortalDocKind(doc);
  const url = normalizePortalDocUrl(doc.url);
  const title = portalDocTitle(doc.name);
  const meta = portalDocMetaLine(doc, kind);
  const badge = portalDocBadgeLabel(kind);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [url]);

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

  const downloadHref = url;

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
            {kind === "pdf" ? " · Seite 1 von 1" : null}
          </div>
        </div>
        <a
          href={downloadHref}
          download={doc.name}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-doc-viewer-download"
          onClick={(e) => e.stopPropagation()}
        >
          ↓ Herunterladen
        </a>
        <button
          type="button"
          className="portal-doc-viewer-close"
          aria-label="Schließen"
          onClick={onClose}
        >
          ×
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
          {loadError ? (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                Vorschau nicht verfügbar. Datei herunterladen oder in neuem Tab
                öffnen.
              </p>
              <div className="portal-doc-viewer-fallback-actions">
                <a
                  href={downloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portal-doc-viewer-fallback-btn"
                >
                  In neuem Tab öffnen
                </a>
                <a
                  href={downloadHref}
                  download={doc.name}
                  className="portal-doc-viewer-fallback-btn portal-doc-viewer-fallback-btn--ghost"
                >
                  ↓ Herunterladen
                </a>
              </div>
            </div>
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed/storage URLs
            <img
              src={url}
              alt={title}
              className="portal-doc-viewer-img"
              onError={() => setLoadError(true)}
            />
          ) : kind === "pdf" ? (
            <iframe
              title={title}
              src={url}
              className="portal-doc-viewer-iframe"
              onError={() => setLoadError(true)}
            />
          ) : (
            <div className="portal-doc-viewer-fallback">
              <p className="portal-doc-viewer-fallback-title">{title}</p>
              <p className="portal-doc-viewer-fallback-text">
                Für diesen Dateityp gibt es keine Inline-Vorschau.
              </p>
              <div className="portal-doc-viewer-fallback-actions">
                <a
                  href={downloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portal-doc-viewer-fallback-btn"
                >
                  Öffnen
                </a>
                <a
                  href={downloadHref}
                  download={doc.name}
                  className="portal-doc-viewer-fallback-btn portal-doc-viewer-fallback-btn--ghost"
                >
                  ↓ Herunterladen
                </a>
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
