"use client";

import { useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import {
  PortalAngebotAblehnenModal,
  type PortalAngebotAblehnenPayload,
} from "@/components/shared/PortalAngebotAblehnenModal";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { rejectKundeAngebot } from "@/app/actions/portal-angebot";
import { HV_ANGEBOT_ACTIONS } from "@/lib/portal2/hv-liste";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

type Props = {
  leadId: string;
  /** Für Ablehnen mit Pflicht-Grund (rejectKundeAngebot). */
  angebotId?: string | null;
  onUpdated: () => void;
};

/**
 * Listen-Aktionen Angebots-Freigabe: Ablehnen · Freigeben
 * (links negativ, rechts positiv)
 * Ablehnen → PortalAngebotAblehnenModal → rejectKundeAngebot
 * Freigeben → POST /api/org/freigabe
 */
export function HvAngebotListActions({
  leadId,
  angebotId,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<"freigegeben" | "abgelehnt" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { runBusy } = usePortalBusy();

  const actFreigeben = async () => {
    setBusy(true);
    setBusyId("freigegeben");
    setError(null);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/org/freigabe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, aktion: "freigegeben" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Aktion fehlgeschlagen.");
          return;
        }
        track.orgFreigabe("freigegeben");
        orgPortalToast.freigegeben();
        onUpdated();
      }, 480);
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  };

  const actAblehnen = async (payload: PortalAngebotAblehnenPayload) => {
    const id = (angebotId ?? "").trim();
    if (!id) {
      portalToastError("Bitte im Vorgang ablehnen");
      setRejectOpen(false);
      return;
    }
    setBusy(true);
    setBusyId("abgelehnt");
    setError(null);
    try {
      await runBusy(async () => {
        const res = await rejectKundeAngebot(id, {
          grund: payload.grund,
          notiz: payload.notiz,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setRejectOpen(false);
        track.orgFreigabe("abgelehnt");
        orgPortalToast.freigabeAbgelehnt();
        onUpdated();
      }, 480);
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {HV_ANGEBOT_ACTIONS.map((a) => (
          <PortalButton
            variant="ghost"
            key={a.id}
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              if (a.id === "abgelehnt") {
                const id = (angebotId ?? "").trim();
                if (!id) {
                  portalToastError("Bitte im Vorgang ablehnen");
                  return;
                }
                setRejectOpen(true);
                return;
              }
              void actFreigeben();
            }}
            className="rounded-card px-3.5 py-2 text-fs-meta font-semibold disabled:opacity-60"
            style={
              a.variant === "danger"
                ? {
                    border: "none",
                    background: PORTAL_VAR.dangerSoft,
                    color: PORTAL_VAR.danger,
                  }
                : {
                    border: "none",
                    background: PORTAL_VAR.primary,
                    color: "var(--p2-panel)",
                  }
            }
          >
            {busyId === a.id ? "Wird geladen…" : a.label}
          </PortalButton>
        ))}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-p2-danger">{error}</p>
      ) : null}
      <PortalAngebotAblehnenModal
        open={rejectOpen}
        loading={busy && busyId === "abgelehnt"}
        onClose={() => {
          if (busy) return;
          setRejectOpen(false);
        }}
        onConfirm={(payload) => void actAblehnen(payload)}
      />
    </div>
  );
}
