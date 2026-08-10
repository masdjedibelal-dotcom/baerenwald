"use client";

import { useState } from "react";

import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  funnelDirektauftragFromDaten,
  hvFreigabeEntfaellt,
} from "@/lib/org/freigabe-bypass";
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
 * Akut / unter Schwelle → nur Info (keine Buttons).
 */
export function OrgMeldungAktionBanner({
  lead,
  kunde,
  objekte,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { runBusy } = usePortalBusy();

  const status = lead.hv_meldung_status ?? "neu";
  if (status !== "neu") return null;
  if (lead.einladung_status === "offen") return null;
  // HV-Selbstanlage: keine Start-Freigabe (läuft direkt als Angebot eingefordert)
  if ((lead.erfassung_von ?? "").toLowerCase() === "organisation") return null;

  const funnelDa = funnelDirektauftragFromDaten(lead.funnel_daten);
  const entfaellt = hvFreigabeEntfaellt({
    orgFreigabeStatus: lead.org_freigabe_status,
    bypassGrund: lead.freigabe_bypass_grund,
    funnelDirektauftrag: funnelDa,
    hvMeldungStatus: lead.hv_meldung_status,
    // Neu-Meldung: noch kein Angebot — Schwelle gilt nicht über Preisindikation
    angebotZugestellt: false,
  });
  const infoOnly =
    entfaellt != null || isHvDirektauftragInfoOnly(lead, kunde, objekte);

  if (infoOnly && entfaellt) {
    const schwelle =
      entfaellt === "schwelle" && kunde.freigabe_schwelle_eur != null
        ? new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(Number(kunde.freigabe_schwelle_eur))
        : null;
    return (
      <div className="mb-4">
        <HvFreigabeInfoBanner kind={entfaellt} schwelleLabel={schwelle} />
      </div>
    );
  }

  // Echter Direktauftrag ohne gesetzten Bypass-Kind: nur dann Akut-Info
  if (infoOnly) {
    return (
      <div className="mb-4">
        <HvFreigabeInfoBanner kind="akut" schwelleLabel={null} />
      </div>
    );
  }

  const act = async (aktion: "angebot_einfordern" | "ablehnen") => {
    setBusy(true);
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
        if (aktion === "angebot_einfordern") orgPortalToast.angebotEingefordert();
        else orgPortalToast.meldungAbgelehnt();
        onUpdated();
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 space-y-2 rounded-xl border border-border-default bg-white p-4">
      <p className="portal-text-card-title">Freigabe erforderlich</p>
      <div className="flex flex-wrap gap-2">
        {HV_MELDUNG_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy}
            onClick={() => void act(a.id)}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-60"
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
                    color: "#fff",
                  }
            }
          >
            {a.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="portal-text-meta font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
