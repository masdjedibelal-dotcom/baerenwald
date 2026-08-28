"use client";

import { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";

import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
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
  schadenNr,
  hvMeldungStatus,
  versicherungsaktePdfUrl,
  versicherungsakteErstelltAm,
  schadenNrGeaendertAm,
  versicherungsNrGeaendertAm,
  objektPolicenNr,
  onSaved,
}: Props) {
  const [busy, setBusy] = useState(false);
  const { runBusy } = usePortalBusy();

  const isVersicherung = (kostentraeger ?? "").trim() === "versicherung";
  const hmBlock = (hvMeldungStatus ?? "").trim().toLowerCase() === "hm_pruefung";
  const hasPdf = Boolean(versicherungsaktePdfUrl?.trim());
  const settingsVersNr = (objektPolicenNr ?? "").trim();
  const versNrFehlt = isVersicherung && !settingsVersNr;

  const dataChangedAfterPdf =
    hasPdf &&
    versicherungsakteErstelltAm &&
    ((schadenNrGeaendertAm &&
      schadenNrGeaendertAm > versicherungsakteErstelltAm) ||
      (versicherungsNrGeaendertAm &&
        versicherungsNrGeaendertAm > versicherungsakteErstelltAm));

  async function setAbrechnungVersicherung(ja: boolean) {
    if (ja === isVersicherung) return;
    setBusy(true);
    try {
      await runBusy(async () => {
        const res = await fetch(`/api/org/leads/${leadId}/kostentraeger`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kostentraeger: ja ? "versicherung" : "gemeinschaft",
          }),
        });
        const data = (await res.json()) as { error?: string; schadenakteWarning?: string };
        if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
        if (data.schadenakteWarning) {
          portalToastSuccess(data.schadenakteWarning);
        } else if (ja) {
          portalToastSuccess("Versicherungsabrechnung aktiviert.");
        }
        await onSaved?.();
      }, 320);
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function openAkte(regenerate = false) {
    setBusy(true);
    try {
      await runBusy(async () => {
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
        await onSaved?.();
      }, 320);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalDetailCard title="Versicherung & Abrechnung">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="portal-text-meta font-semibold text-text-secondary">
            Abrechnung über Versicherung?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void setAbrechnungVersicherung(true)}
              className={
                isVersicherung
                  ? "btn-pill-primary portal-btn-compact"
                  : "btn-pill-outline portal-btn-compact"
              }
            >
              Ja
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void setAbrechnungVersicherung(false)}
              className={
                !isVersicherung
                  ? "btn-pill-primary portal-btn-compact"
                  : "btn-pill-outline portal-btn-compact"
              }
            >
              Nein
            </button>
          </div>
          <p className="text-xs text-text-tertiary">
            Bei Ja erstellen wir die Schadenakte automatisch für die Einreichung.
          </p>
        </div>

        {isVersicherung ? (
          <div className="space-y-3 border-t border-border-light pt-3">
            {versNrFehlt ? (
              <p className="portal-text-meta rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                Versicherungsnummer fehlt
              </p>
            ) : null}

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
          </div>
        ) : null}
      </div>
    </PortalDetailCard>
  );
}
