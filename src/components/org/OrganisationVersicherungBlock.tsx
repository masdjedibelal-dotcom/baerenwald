"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import type { VersicherungPdfPhase } from "@/lib/org/versicherung-pdf-readiness";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type PhaseStatus = { ready: boolean; blockers: string[] };

type Readiness = {
  kostentraegerVersicherung: boolean;
  meldung: PhaseStatus;
  ursache: PhaseStatus;
};

type Props = {
  leadId: string;
  onSaved?: () => void;
};

async function openPhasePdf(leadId: string, phase: VersicherungPdfPhase) {
  const win = window.open("about:blank", "_blank");
  const url = `/api/org/versicherungsakte?leadId=${encodeURIComponent(leadId)}&phase=${phase}&regenerate=1`;
  const res = await fetch(url);
  if (!res.ok) {
    win?.close();
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? "PDF nicht verfügbar");
  }
  const blob = await res.blob();
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const objUrl = URL.createObjectURL(pdfBlob);
  if (win) {
    win.opener = null;
    win.location.href = objUrl;
  } else {
    const opened = window.open(objUrl, "_blank");
    if (opened) opened.opener = null;
    if (!opened) {
      const { downloadPortalBlob, portalDocDownloadName } = await import(
        "@/lib/portal2/doc-viewer"
      );
      downloadPortalBlob(
        pdfBlob,
        portalDocDownloadName(
          phase === "meldung" ? "Schadenmeldung" : "Schadenursache",
          "pdf"
        )
      );
    }
  }
  setTimeout(() => URL.revokeObjectURL(objUrl), 120_000);
}

function PhaseCard({
  title,
  description,
  status,
  busy,
  onOpen,
}: {
  title: string;
  description: string;
  status: PhaseStatus | null;
  busy: boolean;
  onOpen: () => void;
}) {
  const ready = status?.ready === true;
  const blocker = status?.blockers[0];

  return (
    <PortalDetailCard title={title}>
      <div className="space-y-3">
        <p className="portal-text-meta text-text-secondary">{description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              ready
                ? "bg-accent-light text-accent"
                : "bg-muted text-text-secondary"
            )}
          >
            {status == null ? "…" : ready ? "Bereit" : "Noch nicht"}
          </span>
          {!ready && blocker ? (
            <span className="text-[12.5px] text-text-tertiary">{blocker}</span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy || !ready}
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          PDF öffnen
        </button>
      </div>
    </PortalDetailCard>
  );
}

/**
 * Versicherung — zwei Phasen-PDFs (Meldung / Ursache).
 * Kein Ja/Nein, keine Rechnung (bleibt unter Dokumente).
 */
export function OrganisationVersicherungBlock({ leadId, onSaved }: Props) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [busy, setBusy] = useState(false);
  const { runBusy } = usePortalBusy();

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/versicherungsakte?leadId=${encodeURIComponent(leadId)}&status=1`
    );
    const json = (await res.json()) as Readiness & { error?: string };
    if (!res.ok) {
      portalToastError(json.error ?? "Status nicht geladen");
      setReadiness(null);
      return;
    }
    setReadiness({
      kostentraegerVersicherung: json.kostentraegerVersicherung,
      meldung: json.meldung,
      ursache: json.ursache,
    });
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openPdf(phase: VersicherungPdfPhase) {
    setBusy(true);
    try {
      await runBusy(async () => {
        await openPhasePdf(leadId, phase);
        portalToastSuccess(
          phase === "meldung"
            ? "Schadenmeldung geöffnet."
            : "Schadenursache geöffnet."
        );
        await onSaved?.();
        await load();
      }, 320);
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <PhaseCard
        title="Schadenmeldung"
        description="Hergang, Melder und Objektangaben für die Einreichung."
        status={readiness?.meldung ?? null}
        busy={busy}
        onOpen={() => void openPdf("meldung")}
      />
      <PhaseCard
        title="Schadenursache"
        description="Befund und Vor-Ort-Updates von Hausmeister und Handwerker."
        status={readiness?.ursache ?? null}
        busy={busy}
        onOpen={() => void openPdf("ursache")}
      />
    </div>
  );
}
