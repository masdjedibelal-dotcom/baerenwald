"use client";

import { useState } from "react";

import { buildMeldeQrUrl, buildMeldeUrl } from "@/lib/org/melde-url";
import type { OrganisationKunde } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  objektCount?: number;
  nested?: boolean;
};

export function OrganisationMeldeMaterial({
  kunde,
  objektCount = 0,
  nested = false,
}: Props) {
  const orgKennung = kunde.org_kennung?.trim() ?? "";
  const meldeUrl = orgKennung ? buildMeldeUrl(orgKennung) : "";
  const [qrOpen, setQrOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    if (!meldeUrl) return;
    await navigator.clipboard.writeText(meldeUrl);
    orgPortalToast.linkKopiert();
  }

  async function downloadPdf() {
    setPdfBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/melde-aushang");
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "PDF konnte nicht erstellt werden.");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `Aushang-${orgKennung || "melden"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      orgPortalToast.aushangPdfErstellt();
    } finally {
      setPdfBusy(false);
    }
  }

  if (!orgKennung) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Melde-Link noch nicht verfügbar</p>
        <p className="mt-1 text-amber-800">
          Die Organisations-Kennung fehlt. Bitte Bärenwald kontaktieren — danach
          können Link, QR-Code und Aushang-PDF erstellt werden.
        </p>
      </div>
    );
  }

  return (
    <section
      className={
        nested
          ? "space-y-4 border-t border-border-default pt-5"
          : "portal-surface space-y-4 p-4 sm:p-5"
      }
    >
      <div>
        <h3 className="font-semibold text-text-primary">Schadensmeldung für Mieter</h3>
        <p className="portal-text-meta mt-1 text-text-secondary">
          Ein Link für alle Objekte — Mieter wählen ihr Gebäude im Formular.
          {objektCount === 0
            ? " Legen Sie zuerst unter Objekte mindestens ein Gebäude an."
            : null}
        </p>
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
        <p className="portal-text-meta text-text-tertiary">Melde-Link</p>
        <p className="portal-text-body mt-0.5 break-all font-medium text-text-primary">
          {meldeUrl}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-pill-outline !py-2" onClick={copyLink}>
          Link kopieren
        </button>
        <button
          type="button"
          className="btn-pill-outline !py-2"
          onClick={() => setQrOpen(true)}
        >
          QR-Code anzeigen
        </button>
        <button
          type="button"
          className="btn-pill-primary !py-2"
          disabled={pdfBusy}
          onClick={downloadPdf}
        >
          {pdfBusy ? "Wird erstellt…" : "Aushang PDF"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {qrOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white p-4 text-center">
            <img
              src={buildMeldeQrUrl(meldeUrl)}
              alt="QR-Code Schadensmeldung"
              className="mx-auto"
            />
            <p className="portal-text-meta mt-2 text-text-secondary">
              QR-Code zum Ausdrucken oder Teilen
            </p>
            <button
              type="button"
              className="btn-pill-primary mt-3 w-full"
              onClick={() => setQrOpen(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
