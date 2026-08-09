"use client";

import { useState } from "react";

import { formatPreisspanneDisplay } from "@/lib/org/hv-meldung-workflow";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { HV_MELDUNG_ACTIONS } from "@/lib/portal2/hv-liste";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";

type Props = {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  objekte?: OrganisationObjekt[];
  onUpdated: () => void;
};

/**
 * Detail-Banner: Vorgang freigeben · Ablehnen
 * Sofortmaßnahme + Direktbeauftragung aktiv → nur Info (keine Buttons).
 */
export function OrgMeldungAktionBanner({
  lead,
  kunde,
  objekte,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = lead.hv_meldung_status ?? "neu";
  if (status !== "neu") return null;
  if (lead.einladung_status === "offen") return null;

  const infoOnly = isHvDirektauftragInfoOnly(lead, kunde, objekte);

  if (infoOnly) {
    return (
      <div className="mb-4 space-y-2 rounded-xl border border-[#dce5df] bg-[#f6f9f7] p-4">
        <p className="portal-text-card-title">
          Sofortmaßnahme — wir kümmern uns
        </p>
        <p className="portal-text-meta text-text-secondary">
          Keine Freigabe nötig. Der Vorgang läuft als Direktauftrag bei
          Bärenwald. Diese Meldung dient nur Ihrer Information.
        </p>
        <p className="portal-text-label normal-case tracking-normal text-text-tertiary">
          Geschätzte Spanne:{" "}
          {formatPreisspanneDisplay(
            lead.preis_min,
            lead.preis_max,
            lead.preis_unsicher
          )}
        </p>
      </div>
    );
  }

  const act = async (aktion: "angebot_einfordern" | "ablehnen") => {
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
    <div className="mb-4 space-y-3 rounded-xl border border-[#dce5df] bg-[#f6f9f7] p-4">
      <div>
        <p className="portal-text-card-title">Neue Meldung</p>
        <p className="portal-text-meta mt-1 text-text-secondary">
          Geschätzte Spanne:{" "}
          {formatPreisspanneDisplay(
            lead.preis_min,
            lead.preis_max,
            lead.preis_unsicher
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {HV_MELDUNG_ACTIONS.map((a) => {
          const style =
            a.variant === "danger"
              ? {
                  border: "none",
                  background: PORTAL_VAR.dangerSoft,
                  color: PORTAL_VAR.danger,
                }
              : {
                  border: "none",
                  background: PORTAL_VAR.primary,
                  color: "#fff",
                };
          return (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() => void act(a.id)}
              className="portal-text-meta rounded-lg px-3.5 py-2 font-semibold disabled:opacity-60"
              style={style}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="portal-text-meta text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
