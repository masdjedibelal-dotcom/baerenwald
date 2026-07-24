"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { PortalDocViewerHost } from "@/components/shared/PortalDocViewer";
import type { PortalDocView } from "@/lib/portal2/doc-viewer";

type PortalDocViewerContextValue = {
  /** Mock `openDoc(name, meta)` + reale `url`. */
  openDoc: (doc: PortalDocView) => void;
  closeDoc: () => void;
  doc: PortalDocView | null;
};

const PortalDocViewerContext = createContext<PortalDocViewerContextValue | null>(
  null
);

export function PortalDocViewerProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<PortalDocView | null>(null);

  const openDoc = useCallback((next: PortalDocView) => {
    if (!next.url?.trim()) return;
    setDoc({
      name: next.name.trim() || "Dokument",
      meta: next.meta,
      url: next.url.trim(),
      kind: next.kind,
    });
  }, []);

  const closeDoc = useCallback(() => setDoc(null), []);

  const value = useMemo(
    () => ({ openDoc, closeDoc, doc }),
    [openDoc, closeDoc, doc]
  );

  return (
    <PortalDocViewerContext.Provider value={value}>
      {children}
      <PortalDocViewerHost doc={doc} onClose={closeDoc} />
    </PortalDocViewerContext.Provider>
  );
}

export function usePortalDocViewer(): PortalDocViewerContextValue {
  const ctx = useContext(PortalDocViewerContext);
  if (!ctx) {
    throw new Error(
      "usePortalDocViewer muss innerhalb von PortalDocViewerProvider stehen."
    );
  }
  return ctx;
}

/** Optional — null außerhalb Provider (z. B. Legacy-Screens). */
export function useOptionalPortalDocViewer(): PortalDocViewerContextValue | null {
  return useContext(PortalDocViewerContext);
}
