"use client";

import { useState, type CSSProperties } from "react";

import { HV_MELDUNG_ACTIONS } from "@/lib/portal2/hv-liste";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";

type Aktion = (typeof HV_MELDUNG_ACTIONS)[number]["id"];

type Props = {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  objekte?: OrganisationObjekt[];
  onUpdated: () => void;
};

function btnStyle(variant: "primary" | "ghost" | "danger"): CSSProperties {
  if (variant === "ghost") {
    return {
      border: `1px solid ${PORTAL_VAR.line}`,
      background: "#fff",
      color: PORTAL_VAR.sub,
    };
  }
  if (variant === "danger") {
    return {
      border: "none",
      background: PORTAL_VAR.dangerSoft,
      color: PORTAL_VAR.danger,
    };
  }
  return {
    border: "none",
    background: PORTAL_VAR.primary,
    color: "#fff",
  };
}

/**
 * Listen-Aktionen Meldungen · Eingang: Ablehnen · Vorgang freigeben
 * (links negativ, rechts positiv)
 * → POST /api/org/meldung-aktion
 */
export function HvMeldungListActions({
  lead,
  kunde,
  objekte,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if ((lead.hv_meldung_status ?? "neu") !== "neu") return null;
  if (lead.einladung_status === "offen") return null;
  if (isHvDirektauftragInfoOnly(lead, kunde, objekte)) return null;

  const act = async (aktion: Aktion) => {
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
      else orgPortalToast.meldungAbgelehnt();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {HV_MELDUNG_ACTIONS.map((a) => (
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
        ))}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
