"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import { fetchObjektHmDelegierbar } from "@/lib/org/fetch-objekt-hm-delegierbar";
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
  onUpdated: () => void | Promise<void>;
};

function btnStyle(variant: "primary" | "ghost" | "danger"): CSSProperties {
  if (variant === "ghost") {
    return {
      border: `1px solid ${PORTAL_VAR.line}`,
      background: "var(--p2-panel)",
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
    color: "var(--p2-panel)",
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
  const [busyAktion, setBusyAktion] = useState<Aktion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHm, setHasHm] = useState(false);
  const { runBusy } = usePortalBusy();

  const status = (lead.hv_meldung_status ?? "neu").trim().toLowerCase();
  const isNeu = status === "neu";
  const isHmPruefung = status === "hm_pruefung";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const st = await fetchObjektHmDelegierbar(lead.kunde_objekt_id);
      if (!cancelled) setHasHm(st.canDelegate);
    })();
    return () => {
      cancelled = true;
    };
  }, [lead.kunde_objekt_id, isNeu]);

  if (lead.einladung_status === "offen") return null;
  if (isHvDirektauftragInfoOnly(lead, kunde, objekte)) return null;

  if (isHmPruefung) {
    // Auftrag liegt beim HM — keine HV-Override-Buttons
    return null;
  }

  if (!isNeu) return null;

  const act = async (aktion: Aktion) => {
    setBusy(true);
    setBusyAktion(aktion);
    setError(null);
    try {
      await runBusy(async () => {
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
        await onUpdated();
      }, 480);
    } finally {
      setBusy(false);
      setBusyAktion(null);
    }
  };

  const label = (aktion: Aktion, idle: string) =>
    busyAktion === aktion ? "Wird geladen…" : idle;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <PortalButton
          variant="ghost"
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void act("ablehnen");
          }}
          className="rounded-card px-3.5 py-2 text-fs-meta font-semibold disabled:opacity-60"
          style={btnStyle("danger")}
        >
          {label("ablehnen", "Ablehnen")}
        </PortalButton>
        {hasHm ? (
          <PortalButton
            variant="ghost"
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void act("hm_begutachten");
            }}
            className="rounded-card px-3.5 py-2 text-fs-meta font-semibold disabled:opacity-60"
            style={btnStyle("ghost")}
          >
            {label("hm_begutachten", "Hausmeister")}
          </PortalButton>
        ) : null}
        <PortalButton
          variant="ghost"
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void act("direkt_baerenwald");
          }}
          className="rounded-card px-3.5 py-2 text-fs-meta font-semibold disabled:opacity-60"
          style={btnStyle("primary")}
        >
          {label("direkt_baerenwald", "Direkt Bärenwald")}
        </PortalButton>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-p2-danger">{error}</p>
      ) : null}
    </div>
  );
}
