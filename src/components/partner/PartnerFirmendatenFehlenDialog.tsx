"use client";

import { useRouter } from "next/navigation";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  einstellungenNavStorageKey,
  type EinstellungenTabId,
} from "@/lib/portal2/einstellungen-nav";

function tabForMissing(_missing: string[]): EinstellungenTabId {
  return "anschrift";
}

type Purpose = "angebot" | "rechnung";

/**
 * Hinweis: Auto-Dokument geht nicht ohne vollständige Firmendaten.
 * CTA führt zu den Einstellungen — kein Direkt-Redirect ohne Aktion.
 */
export function PartnerFirmendatenFehlenDialog({
  open,
  missing = [],
  purpose = "angebot",
  onDismiss,
  onGoSettings,
}: {
  open: boolean;
  missing?: string[];
  purpose?: Purpose;
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

  const title =
    purpose === "rechnung"
      ? "Firmendaten unvollständig"
      : "Kein automatisches Angebot";

  const body =
    purpose === "rechnung"
      ? `Um die Rechnung über das Portal zu erstellen, müssen alle Firmendaten vollständig sein${
          missing.length > 0 ? ` (fehlt: ${missing.join(", ")})` : ""
        }. Bitte ergänze sie in den Einstellungen und versuche es danach erneut.`
      : `Kein automatisches Angebot — Firmendaten fehlen${
          missing.length > 0 ? ` (${missing.join(", ")})` : ""
        }.`;

  return (
    <PortalModalShell
      open={open}
      title={title}
      onClose={onDismiss}
      variant="confirm"
      maxWidth={440}
    >
      <p className="portal-text-body text-text-secondary">{body}</p>
      <div className="portal-action-row mt-5">
        <button
          type="button"
          onClick={onDismiss}
          className="portal-action-btn portal-action-btn--secondary"
        >
          Alles klar
        </button>
        <button
          type="button"
          onClick={goFirmeneinstellungen}
          className="portal-action-btn portal-action-btn--primary"
        >
          Zu Firmeneinstellungen
        </button>
      </div>
    </PortalModalShell>
  );
}
