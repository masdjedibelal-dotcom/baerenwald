"use client";

import { useEffect, useState } from "react";

import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import { PortalDetailInfoBox } from "@/components/shared/PortalDetailUi";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  funnelDirektauftragFromDaten,
  hvFreigabeEntfaellt,
} from "@/lib/org/freigabe-bypass";
import { fetchObjektHmDelegierbar } from "@/lib/org/fetch-objekt-hm-delegierbar";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import { orgPortalToast } from "@/lib/shared/portal-toast";
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

type Aktion =
  | "ablehnen"
  | "hm_begutachten"
  | "direkt_baerenwald"
  | "angebot_einfordern";

/**
 * Detail-Banner: Ablehnen · (optional) Selbst begutachten · Direkt Bärenwald
 * Akut / unter Schwelle → nur Info.
 * Während hm_pruefung: nur Hinweis (Auftrag liegt beim Hausmeister).
 */
export function OrgMeldungAktionBanner({
  lead,
  kunde,
  objekte,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
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
  }, [lead.kunde_objekt_id, isNeu, isHmPruefung]);

  if (lead.einladung_status === "offen") return null;
  if ((lead.erfassung_von ?? "").toLowerCase() === "organisation") return null;

  if (isHmPruefung) {
    return (
      <div className="mb-4">
        <PortalDetailInfoBox>
          <p className="font-semibold text-text-primary">
            Hausmeister-Prüfung läuft
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            Der Vorgang liegt beim Hausmeister. Fortschritt und Checkliste unter
            Tab „Hausmeister“.
          </p>
        </PortalDetailInfoBox>
      </div>
    );
  }

  if (!isNeu) return null;

  const funnelDa = funnelDirektauftragFromDaten(lead.funnel_daten);
  const entfaellt = hvFreigabeEntfaellt({
    orgFreigabeStatus: lead.org_freigabe_status,
    bypassGrund: lead.freigabe_bypass_grund,
    funnelDirektauftrag: funnelDa,
    hvMeldungStatus: lead.hv_meldung_status,
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

  if (infoOnly) {
    return (
      <div className="mb-4">
        <HvFreigabeInfoBanner kind="akut" schwelleLabel={null} />
      </div>
    );
  }

  const act = async (aktion: Aktion) => {
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
        if (aktion === "hm_begutachten") orgPortalToast.hmBegutachten();
        else if (aktion === "ablehnen") orgPortalToast.meldungAbgelehnt();
        else orgPortalToast.angebotEingefordert();
        await onUpdated();
      }, 480);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 space-y-3">
      <PortalDetailInfoBox variant="warning">
        <p className="font-semibold text-amber-950">Freigabe erforderlich</p>
        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </PortalDetailInfoBox>
      <div className="portal-action-row flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("ablehnen")}
          className="portal-action-btn portal-action-btn--secondary"
        >
          {busy ? "Wird geladen…" : "Ablehnen"}
        </button>
        {hasHm ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("hm_begutachten")}
            className="portal-action-btn portal-action-btn--secondary"
          >
            {busy ? "Wird geladen…" : "Selbst begutachten (Hausmeister)"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("direkt_baerenwald")}
          className="portal-action-btn portal-action-btn--primary"
        >
          {busy ? "Wird geladen…" : "Direkt Bärenwald beauftragen"}
        </button>
      </div>
    </div>
  );
}
