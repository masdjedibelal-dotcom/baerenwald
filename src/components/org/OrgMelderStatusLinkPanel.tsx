"use client";

import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  statusUrl: string;
  melderName?: string | null;
};

/** HV: Status-Link an Mieter weitergeben (kein Mieter-Mail-Versand). */
export function OrgMelderStatusLinkPanel({ statusUrl, melderName }: Props) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(statusUrl);
      orgPortalToast.linkKopiert();
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="portal-surface space-y-2 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Mieter-Status-Link</h3>
      <p className="portal-text-meta text-text-secondary">
        {melderName?.trim()
          ? `Link für ${melderName.trim()} — per SMS, WhatsApp oder Anruf weitergeben.`
          : "Link für den Mieter — per SMS, WhatsApp oder Anruf weitergeben."}
      </p>
      <p className="break-all rounded-lg border border-border-light bg-muted/40 px-3 py-2 font-mono text-xs text-text-primary">
        {statusUrl}
      </p>
      <button type="button" className="btn-pill-outline portal-btn-compact" onClick={() => void copy()}>
        Status-Link kopieren
      </button>
    </section>
  );
}
