"use client";

import { useState } from "react";

import { orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";

type Props = {
  leadId: string;
  status: string;
  onUpdated: () => void;
  /**
   * Angebot unter Freigabeschwelle: kein Freigabe-Button,
   * nur Hinweis auf Direkt-Durchführung.
   */
  unterSchwelle?: boolean;
  schwelleLabel?: string;
};

export function OrgFreigabeBanner({
  leadId,
  status,
  onUpdated,
  unterSchwelle = false,
  schwelleLabel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "ausstehend" && !unterSchwelle) return null;

  if (unterSchwelle) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">
          Direkt Durchführung — Angebot unter Freigabeschwelle
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          {schwelleLabel
            ? `Das Angebot liegt unter Ihrer Freigabeschwelle (${schwelleLabel}). `
            : "Das Angebot liegt unter Ihrer Freigabeschwelle. "}
          Der Handwerker kann die Durchführung direkt starten — Sie müssen nicht
          freigeben. Sie erhalten dazu eine E-Mail.
        </p>
      </div>
    );
  }

  const act = async (aktion: "freigegeben" | "abgelehnt") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/freigabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, aktion }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Freigabe fehlgeschlagen.");
        return;
      }
      track.orgFreigabe(aktion);
      if (aktion === "freigegeben") {
        orgPortalToast.freigegeben();
      } else {
        orgPortalToast.freigabeAbgelehnt();
      }
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Angebots-Freigabe</p>
      <p className="mt-1 text-xs text-amber-800">
        Bärenwald hat Angebote erstellt — bitte prüfen und freigeben. Das gibt
        den Vorgang für die weitere Koordination frei. Es ist kein „Angebot
        annehmen“ (kein Auftrag aus Ihrer Annahme).
      </p>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-pill-primary !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("freigegeben")}
        >
          Freigeben
        </button>
        <button
          type="button"
          className="btn-pill-outline !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("abgelehnt")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
