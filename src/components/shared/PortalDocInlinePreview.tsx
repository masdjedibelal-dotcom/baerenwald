"use client";

import { useEffect, useState } from "react";

import { PortalDocPdfCanvas } from "@/components/shared/PortalDocPdfCanvas";
import {
  fetchPortalDocBlob,
  normalizePortalDocUrl,
} from "@/lib/portal2/doc-viewer";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  className?: string;
};

/**
 * Inline-PDF-Vorschau (Desktop) — gleicher Fetch wie der Vollbild-Viewer.
 */
export function PortalDocInlinePreview({ url, title, className }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const href = normalizePortalDocUrl(url);
    setLoading(true);
    setError(false);
    setPreviewUrl(null);

    void (async () => {
      try {
        const blob = await fetchPortalDocBlob(href);
        if (cancelled) return;
        const typed =
          blob.type === "application/pdf"
            ? blob
            : new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(typed);
        setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (loading) {
    return (
      <p
        className={cn("px-3 py-8 text-center portal-text-meta", className)}
        style={{ color: PORTAL_VAR.sub }}
      >
        Vorschau wird geladen…
      </p>
    );
  }

  if (error || !previewUrl) {
    return (
      <p
        className={cn("px-3 py-6 text-center portal-text-meta", className)}
        style={{ color: PORTAL_VAR.sub }}
      >
        Vorschau nicht verfügbar.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "max-h-[min(72vh,820px)] overflow-auto rounded-xl border bg-[#eceeed]",
        className
      )}
      style={{ borderColor: PORTAL_VAR.line }}
    >
      <PortalDocPdfCanvas
        src={previewUrl}
        title={title}
        className="portal-doc-viewer-pdf-pages"
      />
    </div>
  );
}
