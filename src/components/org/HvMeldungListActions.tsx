"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";

type Aktion =
  | "ablehnen"
  | "hm_begutachten"
  | "direkt_baerenwald"
  | "angebot_einfordern";

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
 * Listen-Aktionen Meldungen · Eingang
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
  const [hasHm, setHasHm] = useState(false);

  const status = (lead.hv_meldung_status ?? "neu").trim().toLowerCase();
  const isNeu = status === "neu";
  const isHmPruefung = status === "hm_pruefung";

  useEffect(() => {
    setHasHm(true);
  }, [lead.kunde_objekt_id, isNeu]);

  if (lead.einladung_status === "offen") return null;
  if (isHvDirektauftragInfoOnly(lead, kunde, objekte)) return null;

  if (isHmPruefung) {
    const act = async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/org/meldung-aktion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            aktion: "direkt_baerenwald",
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Aktion fehlgeschlagen.");
          return;
        }
        orgPortalToast.angebotEingefordert();
        onUpdated();
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void act();
          }}
          className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
          style={btnStyle("primary")}
        >
          Direkt Bärenwald
        </button>
        {error ? (
          <p className="text-xs font-semibold text-red-700">{error}</p>
        ) : null}
      </div>
    );
  }

  if (!isNeu) return null;

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
      if (aktion === "hm_begutachten") orgPortalToast.hmBegutachten();
      else if (aktion === "ablehnen") orgPortalToast.meldungAbgelehnt();
      else orgPortalToast.angebotEingefordert();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void act("ablehnen");
          }}
          className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
          style={btnStyle("danger")}
        >
          Ablehnen
        </button>
        {hasHm ? (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void act("hm_begutachten");
            }}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
            style={btnStyle("ghost")}
          >
            Hausmeister
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void act("direkt_baerenwald");
          }}
          className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
          style={btnStyle("primary")}
        >
          Direkt Bärenwald
        </button>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
