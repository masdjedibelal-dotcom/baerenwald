"use client";

import type { ReactNode, MouseEvent } from "react";

import { useOptionalPortalDocViewer } from "@/components/shared/PortalDocViewerContext";
import {
  detectPortalDocKind,
  downloadPortalBlob,
  fetchPortalDocBlob,
  normalizePortalDocUrl,
  portalDocDownloadName,
  shouldAvoidNativePdfNavigation,
  type PortalDocKind,
} from "@/lib/portal2/doc-viewer";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  name: string;
  className?: string;
  children: ReactNode;
  /** Optional expliziter Kind-Hinweis */
  kind?: PortalDocKind;
};

/**
 * Öffnet Dokumente über PortalDocViewer (PWA-sicher).
 * Kein `target=_blank` auf PDFs in Standalone/iOS.
 */
export function PortalDocOpenButton({
  href,
  name,
  className,
  children,
  kind: kindProp,
}: Props) {
  const docViewer = useOptionalPortalDocViewer();
  const url = normalizePortalDocUrl(href);
  const kind =
    kindProp ??
    (detectPortalDocKind(name) !== "other"
      ? detectPortalDocKind(name)
      : detectPortalDocKind(url));

  async function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;

    if (docViewer) {
      docViewer.openDoc({ name, url, kind });
      return;
    }

    if (kind === "pdf" && shouldAvoidNativePdfNavigation()) {
      // Ohne Provider: trotzdem nicht top-level navigieren — Blob speichern
      // ist Fallback; mit PortalDocViewerProvider öffnet sich die Vorschau.
      try {
        const blob = await fetchPortalDocBlob(url);
        downloadPortalBlob(blob, portalDocDownloadName(name, kind));
      } catch {
        /* ignore */
      }
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className={cn(className)} onClick={onClick}>
      {children}
    </button>
  );
}
