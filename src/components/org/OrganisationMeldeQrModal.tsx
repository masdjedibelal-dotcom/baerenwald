"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, X } from "lucide-react";

import { PORTAL_MODAL_SCRIM, PORTAL_MODAL_Z_INDEX } from "@/lib/portal2/modal-shell";
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
 * QR-Code als volle-Breite-Bottom-Sheet (nicht als schmales Modal).
 */
export function OrganisationMeldeQrModal({
  open,
  onClose,
  objektId,
  label,
}: Props) {
  const titleId = useId();
  const subId = useId();
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: PORTAL_MODAL_Z_INDEX, background: PORTAL_MODAL_SCRIM }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subId}
        className="flex w-full max-h-[min(88dvh,720px)] flex-col rounded-t-[20px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border-light px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-[18px] font-bold text-text-primary"
            >
              QR-Code
            </h2>
            <p
              id={subId}
              className="mt-0.5 text-[12.5px] leading-relaxed"
              style={{ color: PORTAL_VAR.sub }}
            >
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary hover:bg-muted"
            aria-label="Schließen"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {busy ? (
            <p className="py-10 text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              QR-Code wird erzeugt…
            </p>
          ) : null}
          {error ? (
            <p className="portal-danger py-6 text-center text-[13px]">{error}</p>
          ) : null}
          {blobUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt="QR-Code zum Melde-Link"
              width={260}
              height={260}
              className="max-w-[min(100%,280px)] rounded-xl border border-border-default bg-white p-3 shadow-sm"
            />
          ) : null}
          <button
            type="button"
            disabled={!blobUrl || busy}
            onClick={downloadPng}
            className="btn-pill-primary inline-flex w-full max-w-sm items-center justify-center gap-2 !py-2.5 disabled:opacity-50"
          >
            <Download className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Als Bild speichern
          </button>
          <p
            className="text-center text-[12px] leading-relaxed"
            style={{ color: PORTAL_VAR.sub }}
          >
            PNG-Datei — zum Ausdrucken oder Teilen geeignet.
          </p>
        </div>
      </div>
    </div>
  );
}
