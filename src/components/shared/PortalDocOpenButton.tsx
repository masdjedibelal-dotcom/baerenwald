"use client";

import type { ReactNode, MouseEvent } from "react";
import { useState } from "react";

import { useOptionalPortalDocViewer } from "@/components/shared/PortalDocViewerContext";
import {
  detectPortalDocKind,
  openPortalDocInNewTab,
  shouldAvoidNativePdfNavigation,
  triggerPortalDocDownload,
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
 * Öffnet PDFs in neuem Tab (Browser).
 * iOS/PWA: In-App-Viewer, damit die App nicht ersetzt wird.
 */
export function PortalDocOpenButton({
  href,
  name,
  className,
  children,
  kind: kindProp,
}: Props) {
  const docViewer = useOptionalPortalDocViewer();
  const [busy, setBusy] = useState(false);
  const kind = kindProp ?? detectPortalDocKind(name);

  async function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = href.trim();
    if (!url || busy) return;

    const resolvedKind =
      kind !== "other" ? kind : detectPortalDocKind(url);

    // PWA / iOS: In-App-Viewer statt `_blank` (sonst App weg)
    if (shouldAvoidNativePdfNavigation() && docViewer) {
      docViewer.openDoc({ name, url, kind: resolvedKind });
      return;
    }

    setBusy(true);
    try {
      if (resolvedKind === "pdf" || resolvedKind === "image") {
        await openPortalDocInNewTab(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (docViewer) {
        docViewer.openDoc({ name, url, kind: resolvedKind });
      } else {
        // Letzter Fallback: erzwungener Download
        try {
          await triggerPortalDocDownload(url, name);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={cn(className)} onClick={onClick} disabled={busy}>
      {children}
    </button>
  );
}
