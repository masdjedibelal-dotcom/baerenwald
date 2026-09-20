"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { openPortalDocInNewTab } from "@/lib/portal2/doc-viewer";
import { portalToastError } from "@/lib/shared/portal-toast";
import { TOAST } from '@/lib/portal-copy'

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
      portalToastError(TOAST.pdf_konnte_nicht_geoeffnet_werden);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalButton
      variant="primary"
      type="button"
      disabled={busy}
      onClick={() => void onClick()}
      className="inline-flex items-center gap-2 rounded-card border border-border-default px-3 py-2 text-sm font-medium text-accent hover:bg-accent-light/40 disabled:opacity-50"
    >
      <PortalIcon n="file-text" ctx="default" className="h-4 w-4" />
      {busy ? "Wird geöffnet…" : "Schadenmeldung (PDF)"}
    </PortalButton>
  );
}
