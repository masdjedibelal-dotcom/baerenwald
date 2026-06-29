"use client";

import { useState } from "react";

import {
  canOfferKleinreparatur,
  formatPreisspanneDisplay,
} from "@/lib/org/hv-meldung-workflow";
import { isMeldeNotfall } from "@/lib/org/org-eingang-utils";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import type { OrganisationKunde, OrganisationLead } from "@/lib/org/types";

type Props = {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  onUpdated: () => void;
};

export function OrgMeldungAktionBanner({ lead, kunde, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [kleinreparaturChecked, setKleinreparaturChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = lead.hv_meldung_status ?? "neu";
  if (status !== "neu") return null;
  if (lead.einladung_status === "offen") return null;

  const notfall = isMeldeNotfall(lead);
  const kleinreparaturMoeglich = canOfferKleinreparatur(kunde, lead.preis_max);

  const act = async (
    aktion: "angebot_einfordern" | "ablehnen" | "kleinreparatur_freigeben"
  ) => {
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
      if (aktion === "angebot_einfordern") {
        orgPortalToast.angebotEingefordert();
      } else if (aktion === "ablehnen") {
        orgPortalToast.meldungAbgelehnt();
      } else {
        orgPortalToast.kleinreparaturFreigegeben();
      }
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#dce5df] bg-[#f6f9f7] p-4 mb-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Neue Meldung</p>
        <p className="text-xs text-text-secondary mt-1">
          Geschätzte Spanne:{" "}
          {formatPreisspanneDisplay(
            lead.preis_min,
            lead.preis_max,
            lead.preis_unsicher
          )}
        </p>
        {notfall ? (
          <p className="text-xs text-red-700 mt-1 font-medium">
            Notfall — bitte Angebot express einfordern (kein Direkt-Start).
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-pill-primary !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("angebot_einfordern")}
        >
          {notfall ? "Angebot einfordern (Express)" : "Angebot einfordern"}
        </button>
        <button
          type="button"
          className="btn-pill-outline !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("ablehnen")}
        >
          Ablehnen
        </button>
      </div>

      {kleinreparaturMoeglich && kunde.kleinreparatur_aktiv ? (
        <div className="rounded-lg border border-border-light bg-white p-3 space-y-2">
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={kleinreparaturChecked}
              onChange={(e) => setKleinreparaturChecked(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Kleinreparatur ohne Angebot (≤{" "}
              {kunde.kleinreparatur_schwelle_eur ?? 200} €)
            </span>
          </label>
          {kleinreparaturChecked ? (
            <button
              type="button"
              className="btn-pill-outline !py-1.5 !text-xs w-full"
              disabled={busy}
              onClick={() => act("kleinreparatur_freigeben")}
            >
              Kleinreparatur freigeben
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
