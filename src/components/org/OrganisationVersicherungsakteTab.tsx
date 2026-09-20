"use client";

import { useEffect, useState } from "react";

import { PortalInput } from "@/components/shared/PortalFormControls";
import { OrganisationVersicherungBlock } from "@/components/org/OrganisationVersicherungBlock";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { portalToastSystemError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { TOAST } from '@/lib/portal-copy'

type Props = {
  leadId: string;
  kostentraeger?: string | null;
  versicherungsNr?: string | null;
  objektPolicenNr?: string | null;
  onSaved?: () => void | Promise<void>;
};

function isVersicherungsAbrechnung(kt: string | null | undefined): boolean {
  const v = String(kt ?? "").trim().toLowerCase();
  return v === "versicherung";
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
  /** Lokal halten — Parent-Detail aktualisiert nach Speichern oft erst nach Reload. */
  const [ktLocal, setKtLocal] = useState(kostentraeger ?? "");
  const versicherung = isVersicherungsAbrechnung(ktLocal);
  const [versNr, setVersNr] = useState(
    versicherungsNr?.trim() || objektPolicenNr?.trim() || ""
  );
  const [busy, setBusy] = useState(false);
  /** Ja → PDF wird serverseitig erzeugt — sichtbares Loading darunter. */
  const [generatingAkte, setGeneratingAkte] = useState(false);
  const { runBusy } = usePortalBusy();

  useEffect(() => {
    setKtLocal(kostentraeger ?? "");
  }, [kostentraeger]);

  useEffect(() => {
    setVersNr(versicherungsNr?.trim() || objektPolicenNr?.trim() || "");
  }, [versicherungsNr, objektPolicenNr]);

  async function setAbrechnung(ja: boolean) {
    if (ja === versicherung) return;
    const prev = ktLocal;
    setKtLocal(ja ? "versicherung" : "unklar");
    setBusy(true);
    if (ja) setGeneratingAkte(true);
    try {
      await runBusy(async () => {
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
          portalToastSuccess(`${TOAST.gespeichertKurz} ${data.schadenakteWarning}`);
        } else {
          portalToastSuccess(
            ja ? "Versicherungsabrechnung aktiv." : "Gespeichert."
          );
        }
        await onSaved?.();
      }, ja ? 700 : 320);
    } catch (e) {
      setKtLocal(prev);
      portalToastSystemError(e, "org-versicherungsakte-kt");
    } finally {
      setBusy(false);
      setGeneratingAkte(false);
    }
  }

  async function speichernVersNr() {
    if (!versicherung) return;
    setBusy(true);
    try {
      await runBusy(async () => {
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
          portalToastSuccess(`${TOAST.gespeichertKurz} ${data.schadenakteWarning}`);
        } else {
          portalToastSuccess(TOAST.versicherungsnummer_gespeichert);
        }
        await onSaved?.();
      }, 320);
    } catch (e) {
      portalToastSystemError(e, "org-versicherungsakte-nr");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <PortalDetailCard title="Abrechnung über Versicherung">
        <div className="flex flex-wrap gap-2">
          <PortalButton variant="secondary"
            action={false}
            compact
            disabled={busy}
            onClick={() => void setAbrechnung(true)}
            className={versicherung ? "btn-pill-primary" : "btn-pill-outline"}
          >
            Ja
          </PortalButton>
          <PortalButton variant="secondary"
            action={false}
            compact
            disabled={busy}
            onClick={() => void setAbrechnung(false)}
            className={!versicherung ? "btn-pill-primary" : "btn-pill-outline"}
          >
            Nein
          </PortalButton>
        </div>
      </PortalDetailCard>

      {generatingAkte ? (
        <PortalContentBusy
          title="Schadenakte wird erstellt…"
          body="Meldeangaben werden in die Schadenmeldung übernommen. Einen Moment bitte."
          className="min-h-[28vh] rounded-sheet border border-border-default bg-white py-10"
        />
      ) : versicherung ? (
        <>
          <PortalDetailCard title="Versicherungsnummer">
            <PortalInput
              type="text"
              value={versNr}
              onChange={(e) => setVersNr(e.target.value)}
              onBlur={() => void speichernVersNr()}
              placeholder="Versicherungsnummer (optional)"
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
