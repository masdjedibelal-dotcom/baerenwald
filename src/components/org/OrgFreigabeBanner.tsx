"use client";

import { useState } from "react";

import {
  freigabeBypassInfoCopy,
  isFreigabeBypassInfo,
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
};

export function OrgFreigabeBanner({
  leadId,
  status,
  onUpdated,
  bypassGrund = null,
  schwelleLabel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bypass = parseFreigabeBypassGrund(bypassGrund);
  const isInfo = isFreigabeBypassInfo({
    orgFreigabeStatus: status,
    bypassGrund: bypass,
  });

  if (status !== "ausstehend" && !isInfo) return null;

  if (isInfo && bypass) {
    const copy = freigabeBypassInfoCopy({
      bypassGrund: bypass,
      schwelleLabel,
    });
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">{copy.title}</p>
        <p className="mt-1 text-xs text-emerald-800">{copy.body}</p>
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
        Bärenwald hat ein Angebot erstellt — bitte prüfen und freigeben. Danach
        läuft die Koordination weiter. Das ist kein „Angebot annehmen“ gegenüber
        dem Handwerker.
      </p>
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-pill-primary"
          disabled={busy}
          onClick={() => void act("freigegeben")}
        >
          Freigeben
        </button>
        <button
          type="button"
          className="btn-pill-outline"
          disabled={busy}
          onClick={() => void act("abgelehnt")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
