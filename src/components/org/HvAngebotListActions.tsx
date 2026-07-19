"use client";

import { useState } from "react";

import { HV_ANGEBOT_ACTIONS } from "@/lib/portal2/hv-liste";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";
import { PORTAL_C } from "@/lib/portal2/tokens";

type Props = {
  leadId: string;
  onUpdated: () => void;
};

/**
 * Mock Listen-Aktionen Angebots-Freigabe: Freigeben · Ablehnen
 * → POST /api/org/freigabe (`actAngebotAnnehmen` / Ablehnen)
 */
export function HvAngebotListActions({ leadId, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(json.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      track.orgFreigabe(aktion);
      if (aktion === "freigegeben") orgPortalToast.freigegeben();
      else orgPortalToast.freigabeAbgelehnt();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {HV_ANGEBOT_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void act(a.id);
            }}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
            style={
              a.variant === "danger"
                ? { border: "none", background: "#FCE3E3", color: "#A1242A" }
                : {
                    border: "none",
                    background: "var(--org-primary, " + PORTAL_C.primary + ")",
                    color: "#fff",
                  }
            }
          >
            {a.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
