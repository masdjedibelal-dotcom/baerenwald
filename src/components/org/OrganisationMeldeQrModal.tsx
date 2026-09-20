"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useEffect, useRef, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { meldeQrPngPath } from "@/lib/portal2/aushang";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

type Props = {
  open: boolean;
  onClose: () => void;
  objektId?: string;
  /** Anzeigename für Dateiname / Untertitel */
  label?: string;
};

/**
 * QR-Code — Shell `preview` (mobil Sheet, Desktop Side-Over).
 */
export function OrganisationMeldeQrModal({
  open,
  onClose,
  objektId,
  label,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setBlobUrl(null);
      setError(null);
      setBusy(false);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setError(null);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      setBlobUrl(null);
    }

    void (async () => {
      try {
        const res = await fetch(meldeQrPngPath(objektId), {
          cache: "no-store",
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(json?.error || "QR-Code konnte nicht geladen werden.");
        }
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "QR-Code fehlgeschlagen.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, objektId]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const subtitle = label?.trim() || "Melde-Link scannen";
  const downloadName = (() => {
    const base = (label || "Melde-Link")
      .replace(/[^\w\-äöüÄÖÜß]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
    return `QR-${base || "Melde-Link"}.png`;
  })();

  function downloadPng() {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <PortalModalShell
      open={open}
      title="QR-Code"
      subtitle={subtitle}
      onClose={onClose}
      variant="preview"
      maxWidth={420}
    >
      <div className="flex flex-col items-center gap-4">
        {busy ? (
          <p className="py-10 text-fs-meta" style={{ color: PORTAL_VAR.sub }}>
            QR-Code wird erzeugt…
          </p>
        ) : null}
        {error ? (
          <p className="portal-danger py-6 text-center text-fs-meta">{error}</p>
        ) : null}
        {blobUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blobUrl}
            alt="QR-Code zum Melde-Link"
            width={260}
            height={260}
            className="max-w-[min(100%,280px)] rounded-sheet border border-border-default bg-white p-3 shadow-sm"
          />
        ) : null}
        <PortalButton
          variant="primary"
          type="button"
          disabled={!blobUrl || busy}
          onClick={downloadPng}
          className="inline-flex w-full max-w-sm items-center justify-center gap-2 !py-2.5 disabled:opacity-50"
        >
          <PortalIcon n="download" ctx="default" className="h-4 w-4" aria-hidden />
          Als Bild speichern
        </PortalButton>
        <p
          className="text-center text-fs-caption leading-relaxed"
          style={{ color: PORTAL_VAR.sub }}
        >
          PNG-Datei — zum Ausdrucken oder Teilen geeignet.
        </p>
      </div>
    </PortalModalShell>
  );
}
