"use client";

import { useState } from "react";

import { OrganisationVersicherungBlock } from "@/components/org/OrganisationVersicherungBlock";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  leadId: string;
  kostentraeger?: string | null;
  versicherungsNr?: string | null;
  objektPolicenNr?: string | null;
  onSaved?: () => void | Promise<void>;
};

function isVersicherungsAbrechnung(kt: string | null | undefined): boolean {
  return String(kt ?? "").trim().toLowerCase() === "versicherung";
}

/**
 * Tab „Versicherungsakte“ — nur Ja/Nein zur Versicherungsabrechnung.
 * Bei Nein kein weiterer Inhalt; Kostenträger-Chips entfallen.
 */
export function OrganisationVersicherungsakteTab({
  leadId,
  kostentraeger,
  versicherungsNr,
  objektPolicenNr,
  onSaved,
}: Props) {
  const versicherung = isVersicherungsAbrechnung(kostentraeger);
  const [versNr, setVersNr] = useState(
    versicherungsNr?.trim() || objektPolicenNr?.trim() || ""
  );
  const [busy, setBusy] = useState(false);

  async function setAbrechnung(ja: boolean) {
    if (ja === versicherung) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/leads/${leadId}/kostentraeger`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostentraeger: ja ? "versicherung" : "unklar",
          versicherungs_nr: ja ? versNr.trim() || undefined : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        schadenakteWarning?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      if (data.schadenakteWarning) {
        portalToastSuccess("Gespeichert. " + data.schadenakteWarning);
      } else {
        portalToastSuccess(ja ? "Versicherungsabrechnung aktiv." : "Gespeichert.");
      }
      await onSaved?.();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function speichernVersNr() {
    if (!versicherung) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/leads/${leadId}/kostentraeger`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostentraeger: "versicherung",
          versicherungs_nr: versNr.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        schadenakteWarning?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      if (data.schadenakteWarning) {
        portalToastSuccess("Gespeichert. " + data.schadenakteWarning);
      } else {
        portalToastSuccess("Versicherungsnummer gespeichert.");
      }
      await onSaved?.();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <PortalDetailCard title="Abrechnung über Versicherung">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void setAbrechnung(true)}
            className={
              versicherung
                ? "btn-pill-primary portal-btn-compact"
                : "btn-pill-outline portal-btn-compact"
            }
          >
            Ja
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setAbrechnung(false)}
            className={
              !versicherung
                ? "btn-pill-primary portal-btn-compact"
                : "btn-pill-outline portal-btn-compact"
            }
          >
            Nein
          </button>
        </div>
      </PortalDetailCard>

      {versicherung ? (
        <>
          <PortalDetailCard title="Versicherungsdaten">
            <input
              type="text"
              value={versNr}
              onChange={(e) => setVersNr(e.target.value)}
              onBlur={() => void speichernVersNr()}
              placeholder="Policen- / Versicherungsnummer (optional)"
              disabled={busy}
              className="portal-field w-full max-w-md"
            />
          </PortalDetailCard>
          <OrganisationVersicherungBlock leadId={leadId} onSaved={onSaved} />
        </>
      ) : null}
    </div>
  );
}
