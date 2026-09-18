"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import { openPortalDocInNewTab } from "@/lib/portal2/doc-viewer";
import { portalToastError } from "@/lib/shared/portal-toast";

/** Versicherungsakte — Schadenmeldung-PDF immer in neuem Tab. */
export function VersicherungsakteButton({ auftragId }: { auftragId: string }) {
  const [busy, setBusy] = useState(false);
  const href = `/api/org/versicherungsakte?auftragId=${encodeURIComponent(auftragId)}&phase=meldung`;

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await openPortalDocInNewTab(href);
    } catch {
      portalToastError("PDF konnte nicht geöffnet werden");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onClick()}
      className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-accent hover:bg-accent-light/40 disabled:opacity-50"
    >
      <FileText className="h-4 w-4" />
      {busy ? "Wird geöffnet…" : "Schadenmeldung (PDF)"}
    </button>
  );
}
