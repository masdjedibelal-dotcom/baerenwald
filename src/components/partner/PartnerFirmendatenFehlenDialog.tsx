"use client";

import { useRouter } from "next/navigation";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  einstellungenNavStorageKey,
  type EinstellungenTabId,
} from "@/lib/portal2/einstellungen-nav";
import { cn } from "@/lib/utils";

function tabForMissing(missing: string[]): EinstellungenTabId {
  if (missing.some((m) => /Steuer|USt/i.test(m))) return "steuer";
  if (missing.some((m) => /IBAN|Bank/i.test(m))) return "bank";
  return "anschrift";
}

/**
 * Kurzer Hinweis nach Annahme: kein Auto-Angebot ohne Firmendaten.
 */
export function PartnerFirmendatenFehlenDialog({
  open,
  missing = [],
  onDismiss,
  onGoSettings,
}: {
  open: boolean;
  missing?: string[];
  /** „Alles klar“ / Schließen — Vorgang fortsetzen. */
  onDismiss: () => void;
  /** Vor Navigation zu Firmeneinstellungen (ohne Fortsetzen). */
  onGoSettings?: () => void;
}) {
  const router = useRouter();

  function goFirmeneinstellungen() {
    try {
      sessionStorage.setItem(
        einstellungenNavStorageKey("handwerker"),
        tabForMissing(missing)
      );
    } catch {
      /* ignore */
    }
    onGoSettings?.();
    router.push("/partner?section=profil");
  }

  return (
    <PortalModalShell
      open={open}
      title="Kein automatisches Angebot"
      onClose={onDismiss}
      variant="confirm"
      maxWidth={440}
    >
      <p className="portal-text-body text-text-secondary">
        Kein automatisches Angebot — Firmendaten fehlen
        {missing.length > 0 ? ` (${missing.join(", ")})` : ""}.
      </p>
      <div className="portal-confirm-actions mt-5">
        <button
          type="button"
          onClick={goFirmeneinstellungen}
          className={cn(
            "portal-btn portal-confirm-actions-primary",
            "rounded-[9px] border-0 bg-[var(--org-primary,var(--p2-primary,#2E7D52))] font-semibold text-white hover:bg-[var(--org-primary-dk,var(--p2-primary-dk,#256642))]"
          )}
        >
          Zu Firmeneinstellungen
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="portal-btn portal-confirm-actions-cancel rounded-[9px] border border-[var(--p2-line,rgba(0,0,0,0.08))] bg-[var(--p2-selected,#f0f2f0)] font-semibold text-[var(--p2-sub,#404a45)] hover:bg-[var(--p2-hover,#f7f8fa)]"
        >
          Alles klar
        </button>
      </div>
    </PortalModalShell>
  );
}
