"use client";

import { useEffect, useState } from "react";

import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
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
      });
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    setError(null);
    try {
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
    } finally {
      setBusy(false);
    }
  };

  if (isBeschluss) {
    return (
      <div className="mb-4 space-y-3">
        <PortalDetailInfoBox variant="warning">
          <p className="font-semibold text-amber-950">
            Wartet auf Eigentümerbeschluss
          </p>
          <p className="mt-1 text-[13px] text-amber-900/90">
            Der Vorgang ist pausiert, bis ein Beschluss vorliegt. Danach können
            Sie freigeben oder ablehnen.
          </p>
          {error ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-amber-950">
              Versammlung am
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                value={versammlungAm}
                disabled={busy}
                onChange={(e) => setVersammlungAm(e.target.value)}
                onBlur={() => void saveMeta()}
              />
            </label>
            <label className="block text-xs font-medium text-amber-950">
              Beschlussprotokoll (Link)
              <input
                type="url"
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
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
          <button
            type="button"
            className="portal-action-btn portal-action-btn--secondary"
            disabled={busy}
            onClick={() => void act("abgelehnt")}
          >
            Ablehnen
          </button>
          <button
            type="button"
            className="portal-action-btn portal-action-btn--primary"
            disabled={busy}
            onClick={() => void act("freigegeben")}
          >
            Freigeben
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <PortalDetailInfoBox variant="warning">
        <p className="font-semibold text-amber-950">Angebots-Freigabe</p>
        {error ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </PortalDetailInfoBox>
      <div className="portal-action-row flex-wrap">
        <button
          type="button"
          className="portal-action-btn portal-action-btn--secondary"
          disabled={busy}
          onClick={() => void act("abgelehnt")}
        >
          Ablehnen
        </button>
        <button
          type="button"
          className="portal-action-btn portal-action-btn--secondary"
          disabled={busy}
          onClick={() => void act("beschluss_ausstehend")}
        >
          Beschluss erforderlich
        </button>
        <button
          type="button"
          className="portal-action-btn portal-action-btn--primary"
          disabled={busy}
          onClick={() => void act("freigegeben")}
        >
          Freigeben
        </button>
      </div>
    </div>
  );
}
