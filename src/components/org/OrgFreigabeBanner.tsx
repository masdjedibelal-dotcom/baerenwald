"use client";

import { useEffect, useState } from "react";

import { PortalDate, PortalInput } from "@/components/shared/PortalFormControls";
import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalDetailInfoBox } from "@/components/shared/PortalDetailUi";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  hvFreigabeEntfaellt,
  parseFreigabeBypassGrund,
  resolveAngebotZugestelltForHvFreigabe,
} from "@/lib/org/freigabe-bypass";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";

type FreigabeAktion = "freigegeben" | "abgelehnt" | "beschluss_ausstehend";

type Props = {
  leadId: string;
  status: string;
  onUpdated: () => void;
  bypassGrund?: "schwelle" | "akut" | string | null;
  schwelleLabel?: string;
  hvMeldungStatus?: string | null;
  funnelDirektauftrag?: boolean | null;
  beschlussVersammlungAm?: string | null;
  beschlussProtokollUrl?: string | null;
};

export function OrgFreigabeBanner({
  leadId,
  status,
  onUpdated,
  bypassGrund = null,
  schwelleLabel,
  hvMeldungStatus,
  funnelDirektauftrag,
  beschlussVersammlungAm = null,
  beschlussProtokollUrl = null,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versammlungAm, setVersammlungAm] = useState(
    (beschlussVersammlungAm ?? "").slice(0, 10)
  );
  const [protokollUrl, setProtokollUrl] = useState(beschlussProtokollUrl ?? "");
  const { runBusy } = usePortalBusy();

  useEffect(() => {
    setVersammlungAm((beschlussVersammlungAm ?? "").slice(0, 10));
  }, [beschlussVersammlungAm, leadId]);

  useEffect(() => {
    setProtokollUrl(beschlussProtokollUrl ?? "");
  }, [beschlussProtokollUrl, leadId]);

  const bypass = parseFreigabeBypassGrund(bypassGrund);
  const infoKind = hvFreigabeEntfaellt({
    orgFreigabeStatus: status,
    bypassGrund: bypass,
    funnelDirektauftrag,
    hvMeldungStatus,
    angebotZugestellt: resolveAngebotZugestelltForHvFreigabe({
      orgFreigabeStatus: status,
      bypassGrund: bypass,
    }),
  });

  if (infoKind) {
    return (
      <div className="mb-4">
        <HvFreigabeInfoBanner kind={infoKind} schwelleLabel={schwelleLabel} />
      </div>
    );
  }

  const isAusstehend = status === "ausstehend";
  const isBeschluss = status === "beschluss_ausstehend";
  if (!isAusstehend && !isBeschluss) return null;

  const act = async (aktion: FreigabeAktion) => {
    setBusy(true);
    setError(null);
    try {
      await runBusy(async () => {
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
        else if (aktion === "abgelehnt") orgPortalToast.freigabeAbgelehnt();
        onUpdated();
      }, 480);
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/org/freigabe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            beschluss_versammlung_am: versammlungAm || null,
            beschluss_protokoll_url: protokollUrl.trim() || null,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        onUpdated();
      }, 320);
    } finally {
      setBusy(false);
    }
  };

  if (isBeschluss) {
    return (
      <div className="mb-4 space-y-3">
        <PortalDetailInfoBox variant="warning">
          <p className="font-semibold text-warning-text">
            Wartet auf Eigentümerbeschluss
          </p>
          <p className="mt-1 text-fs-meta text-warning-text/90">
            Der Vorgang ist pausiert, bis ein Beschluss vorliegt. Danach können
            Sie freigeben oder ablehnen.
          </p>
          {error ? (
            <p className="mt-2 text-xs text-p2-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-warning-text">
              Versammlung am
              <PortalDate
                className="mt-1 w-full rounded-field border border-warning-border bg-white px-3 py-2 text-sm"
                value={versammlungAm}
                disabled={busy}
                onChange={(e) => setVersammlungAm(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </label>
            <label className="block text-xs font-medium text-warning-text">
              Beschlussprotokoll (Link)
              <PortalInput
                type="url"
                className="mt-1 w-full rounded-field border border-warning-border bg-white px-3 py-2 text-sm"
                placeholder="https://…"
                value={protokollUrl}
                disabled={busy}
                onChange={(e) => setProtokollUrl(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </label>
          </div>
        </PortalDetailInfoBox>
        <div className="portal-action-row">
          <PortalButton
            variant="secondary"
            disabled={busy}
            onClick={() => void act("abgelehnt")}
          >
            {busy ? "Wird geladen…" : "Ablehnen"}
          </PortalButton>
          <PortalButton
            variant="primary"
            disabled={busy}
            onClick={() => void act("freigegeben")}
          >
            {busy ? "Wird geladen…" : "Freigeben"}
          </PortalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <PortalDetailInfoBox variant="warning">
        <p className="font-semibold text-warning-text">Angebots-Freigabe</p>
        {error ? (
          <p className="mt-2 text-xs text-p2-danger" role="alert">
            {error}
          </p>
        ) : null}
      </PortalDetailInfoBox>
      <div className="portal-action-row flex-wrap">
        <PortalButton
          variant="secondary"
          disabled={busy}
          onClick={() => void act("abgelehnt")}
        >
          {busy ? "Wird geladen…" : "Ablehnen"}
        </PortalButton>
        <PortalButton
          variant="secondary"
          disabled={busy}
          onClick={() => void act("beschluss_ausstehend")}
        >
          {busy ? "Wird geladen…" : "Beschluss erforderlich"}
        </PortalButton>
        <PortalButton
          variant="primary"
          disabled={busy}
          onClick={() => void act("freigegeben")}
        >
          {busy ? "Wird geladen…" : "Freigeben"}
        </PortalButton>
      </div>
    </div>
  );
}
