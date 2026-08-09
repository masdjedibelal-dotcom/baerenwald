"use client";

import { useState } from "react";

import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import {
  hvFreigabeEntfaellt,
  parseFreigabeBypassGrund,
} from "@/lib/org/freigabe-bypass";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";

type Props = {
  leadId: string;
  status: string;
  onUpdated: () => void;
  /**
   * Persistiertes CRM-Ergebnis (V2): Bypass → Info, kein Freigabe-Schritt.
   * Portal berechnet die Schwelle nicht selbst — nur lesen.
   */
  bypassGrund?: "schwelle" | "akut" | string | null;
  schwelleLabel?: string;
  hvMeldungStatus?: string | null;
  funnelDirektauftrag?: boolean | null;
};

export function OrgFreigabeBanner({
  leadId,
  status,
  onUpdated,
  bypassGrund = null,
  schwelleLabel,
  hvMeldungStatus,
  funnelDirektauftrag,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bypass = parseFreigabeBypassGrund(bypassGrund);
  const infoKind = hvFreigabeEntfaellt({
    orgFreigabeStatus: status,
    bypassGrund: bypass,
    funnelDirektauftrag,
    hvMeldungStatus,
  });

  if (infoKind) {
    return (
      <div className="mb-4">
        <HvFreigabeInfoBanner kind={infoKind} schwelleLabel={schwelleLabel} />
      </div>
    );
  }

  if (status !== "ausstehend") return null;

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
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="portal-action-btn portal-action-btn--primary"
          disabled={busy}
          onClick={() => void act("freigegeben")}
        >
          Freigeben
        </button>
        <button
          type="button"
          className="portal-action-btn portal-action-btn--secondary"
          disabled={busy}
          onClick={() => void act("abgelehnt")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
