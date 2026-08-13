"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Blob-URL oder https-URL der PDF */
  src: string;
  title: string;
  className?: string;
  onError?: () => void;
};

/**
 * PDF-Vorschau per PDF.js (Canvas) — funktioniert in PWA/iOS ohne System-Download.
 */
export function PortalDocPdfCanvas({ src, title, className, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !src) return;

    host.replaceChildren();
    setError(false);
    setPageCount(0);

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Worker aus CDN — gleiche Version wie npm-Paket, zuverlässig in Next/PWA.
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument({ url: src }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPageCount(doc.numPages);

        const width = Math.min(host.clientWidth || 360, 860);
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(1, width / base.width));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "portal-doc-viewer-pdf-page";
          canvas.setAttribute("aria-label", `${title} — Seite ${i}`);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          host.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        void doc.destroy();
      } catch {
        if (!cancelled) {
          setError(true);
          onError?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [src, title, onError]);

  if (error) {
    return (
      <div className="portal-doc-viewer-fallback">
        <p className="portal-doc-viewer-fallback-title">{title}</p>
        <p className="portal-doc-viewer-fallback-text">
          Vorschau konnte nicht geladen werden.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={className}
      role="document"
      aria-label={
        pageCount > 0 ? `${title} (${pageCount} Seiten)` : `${title} Vorschau`
      }
    />
  );
}
