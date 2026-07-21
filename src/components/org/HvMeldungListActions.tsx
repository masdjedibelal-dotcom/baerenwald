"use client";

import { useState, type CSSProperties } from "react";

import { HV_MELDUNG_ACTIONS } from "@/lib/portal2/hv-liste";
import { canOfferKleinreparatur } from "@/lib/org/hv-meldung-workflow";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { PORTAL_C } from "@/lib/portal2/tokens";
import type { OrganisationKunde, OrganisationLead } from "@/lib/org/types";

type Aktion = (typeof HV_MELDUNG_ACTIONS)[number]["id"];

type Props = {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  onUpdated: () => void;
};

function btnStyle(variant: "primary" | "ghost" | "danger"): CSSProperties {
  if (variant === "ghost") {
    return {
      border: `1px solid ${PORTAL_C.line}`,
      background: "#fff",
      color: PORTAL_C.sub,
    };
  }
  if (variant === "danger") {
    return {
      border: "none",
      background: "#FCE3E3",
      color: "#A1242A",
    };
  }
  return {
    border: "none",
    background: "var(--org-primary, " + PORTAL_C.primary + ")",
    color: "#fff",
  };
}

/**
 * Mock Listen-Aktionen Meldungen · Eingang:
 * Angebot einfordern · Kleinreparatur freigeben · Ablehnen
 * → POST /api/org/meldung-aktion
 */
export function HvMeldungListActions({ lead, kunde, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if ((lead.hv_meldung_status ?? "neu") !== "neu") return null;
  if (lead.einladung_status === "offen") return null;

  const kleinOk =
    canOfferKleinreparatur(kunde, lead.preis_max) && kunde.kleinreparatur_aktiv;

  const act = async (aktion: Aktion) => {
    if (aktion === "kleinreparatur_freigeben" && !kleinOk) {
      setError("Sofort beauftragen ist für diese Meldung nicht verfügbar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/meldung-aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, aktion }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      if (aktion === "angebot_einfordern") orgPortalToast.angebotEingefordert();
      else if (aktion === "ablehnen") orgPortalToast.meldungAbgelehnt();
      else orgPortalToast.kleinreparaturFreigegeben();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {HV_MELDUNG_ACTIONS.map((a) => {
          if (a.id === "kleinreparatur_freigeben" && !kleinOk) return null;
          return (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void act(a.id);
              }}
              className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
              style={btnStyle(a.variant)}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
