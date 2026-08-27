"use client";

import { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";

import { KostentraegerSelector } from "@/components/org/KostentraegerSelector";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  leadId: string;
  kostentraeger?: string | null;
  kostentraegerVorgeschlagen?: boolean;
  versicherungsNr?: string | null;
  schadenNr?: string | null;
  hvMeldungStatus?: string | null;
  versicherungsaktePdfUrl?: string | null;
  versicherungsakteErstelltAm?: string | null;
  schadenNrGeaendertAm?: string | null;
  versicherungsNrGeaendertAm?: string | null;
  objektPolicenNr?: string | null;
  onSaved?: () => void;
};

function fmtDatum(iso: string | null | undefined): string {
  const d = iso?.trim()?.slice(0, 10);
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("de-DE");
}

export function OrganisationVersicherungBlock({
  leadId,
  kostentraeger,
  kostentraegerVorgeschlagen,
  versicherungsNr,
  schadenNr,
  hvMeldungStatus,
  versicherungsaktePdfUrl,
  versicherungsakteErstelltAm,
  schadenNrGeaendertAm,
  versicherungsNrGeaendertAm,
  objektPolicenNr,
  onSaved,
}: Props) {
  const [localSchadenNr, setLocalSchadenNr] = useState(schadenNr ?? "");
  const [localVersNr, setLocalVersNr] = useState(
    versicherungsNr ?? objektPolicenNr ?? ""
  );
  const [busy, setBusy] = useState(false);

  const isVersicherung = (kostentraeger ?? "").trim() === "versicherung";
  const hmBlock = (hvMeldungStatus ?? "").trim().toLowerCase() === "hm_pruefung";
  const hasPdf = Boolean(versicherungsaktePdfUrl?.trim());

  const dataChangedAfterPdf =
    hasPdf &&
    versicherungsakteErstelltAm &&
    ((schadenNrGeaendertAm &&
      schadenNrGeaendertAm > versicherungsakteErstelltAm) ||
      (versicherungsNrGeaendertAm &&
        versicherungsNrGeaendertAm > versicherungsakteErstelltAm));

  async function saveSchadenNr() {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/leads/${leadId}/kostentraeger`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostentraeger: "versicherung",
          versicherungs_nr: localVersNr.trim() || undefined,
          schaden_nr: localSchadenNr.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; schadenakteWarning?: string };
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      if (data.schadenakteWarning) {
        portalToastSuccess("Gespeichert. " + data.schadenakteWarning);
      } else {
        portalToastSuccess("Versicherungsdaten gespeichert.");
      }
      onSaved?.();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function openAkte(regenerate = false) {
    setBusy(true);
    try {
      const url = `/api/org/versicherungsakte?leadId=${encodeURIComponent(leadId)}${regenerate ? "&regenerate=1" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        portalToastError(j?.error ?? "Schadenakte nicht verfügbar");
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      window.open(objUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      if (regenerate) portalToastSuccess("Schadenakte aktualisiert.");
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalDetailCard title="Versicherung & Abrechnung">
      <div className="space-y-3">
        <KostentraegerSelector
          leadId={leadId}
          value={kostentraeger}
          vorgeschlagen={kostentraegerVorgeschlagen}
          versicherungsNr={localVersNr}
          onSaved={onSaved}
        />

        {isVersicherung ? (
          <>
            <label className="block text-[13px]">
              <span className="portal-text-label mb-1 block">Policen-Nr.</span>
              <input
                className="portal-field w-full"
                value={localVersNr}
                onChange={(e) => setLocalVersNr(e.target.value)}
                placeholder={objektPolicenNr ? "Aus Objekt-Stammdaten" : ""}
              />
              {objektPolicenNr && !versicherungsNr ? (
                <span className="portal-text-meta mt-1 block text-text-tertiary">
                  Aus Objekt-Stammdaten übernommen.
                </span>
              ) : null}
            </label>
            <label className="block text-[13px]">
              <span className="portal-text-label mb-1 block">Schaden-Nr.</span>
              <input
                className="portal-field w-full"
                value={localSchadenNr}
                onChange={(e) => setLocalSchadenNr(e.target.value)}
                placeholder="Vom Versicherer, optional"
              />
            </label>
            <button
              type="button"
              className="portal-btn portal-btn-secondary text-[13px]"
              disabled={busy}
              onClick={() => void saveSchadenNr()}
            >
              Versicherungsdaten speichern
            </button>

            {hmBlock ? (
              <p className="portal-text-meta rounded-lg bg-muted/50 px-3 py-2 text-text-secondary">
                Schadenakte nach Hausmeister-Befund verfügbar.
              </p>
            ) : null}

            {!hmBlock && hasPdf ? (
              <div className="space-y-2">
                <p className="portal-text-meta text-text-secondary">
                  Schadenakte
                  {versicherungsakteErstelltAm
                    ? ` vom ${fmtDatum(versicherungsakteErstelltAm)}`
                    : ""}
                  {dataChangedAfterPdf ? " — Daten seitdem geändert" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-accent"
                    disabled={busy}
                    onClick={() => void openAkte(false)}
                  >
                    <FileText className="h-4 w-4" />
                    Schadenakte (PDF)
                  </button>
                  {dataChangedAfterPdf ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-text-primary"
                      disabled={busy}
                      onClick={() => void openAkte(true)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Akte aktualisieren
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!hmBlock && !hasPdf ? (
              <button
                type="button"
                className="portal-btn portal-btn-primary text-[13px]"
                disabled={busy}
                onClick={() => void openAkte(true)}
              >
                Schadenakte erstellen
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </PortalDetailCard>
  );
}
