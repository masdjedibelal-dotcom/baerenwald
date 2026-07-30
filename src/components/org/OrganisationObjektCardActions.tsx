"use client";

import { useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { cn } from "@/lib/utils";

type Props = {
  canAushang?: boolean;
  onAushangPdf?: () => void;
  onQrCode?: () => void;
  onBearbeiten: () => void;
  onKopieren: () => void;
  onLoeschen: () => void;
};

/**
 * Listen-Aktionen Objektkarte: Primär „Aushang PDF“, Rest im ⋯-ActionSheet
 * (mobil Bottom Sheet, Desktop kompakt — Shell `confirm`).
 */
export function OrganisationObjektCardActions({
  canAushang = false,
  onAushangPdf,
  onQrCode,
  onBearbeiten,
  onKopieren,
  onLoeschen,
}: Props) {
  const [open, setOpen] = useState(false);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const item = (label: string, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      className={cn(
        "block w-full rounded-[10px] px-3.5 py-3 text-left text-[14px] font-semibold",
        danger
          ? "portal-danger hover:bg-[var(--p2-danger-soft)]"
          : "text-text-primary hover:bg-muted"
      )}
      onClick={() => run(onClick)}
    >
      {label}
    </button>
  );

  return (
    <div
      className="relative flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {canAushang && onAushangPdf ? (
        <button
          type="button"
          title="Aushang-PDF im Browser öffnen"
          className="rounded-full border border-accent bg-accent-light px-2.5 py-1 text-[11.5px] font-semibold text-accent"
          onClick={onAushangPdf}
        >
          ▦ Aushang PDF
        </button>
      ) : null}

      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-base text-text-secondary"
        aria-label="Weitere Aktionen"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>

      <PortalModalShell
        open={open}
        title="Aktionen"
        onClose={() => setOpen(false)}
        variant="confirm"
        maxWidth={360}
      >
        <div className="flex flex-col gap-0.5">
          {canAushang && onQrCode ? item("QR-Code", onQrCode) : null}
          {item("Bearbeiten", onBearbeiten)}
          {item("Kopieren", onKopieren)}
          <div className="my-1.5 border-t border-border-default" />
          {item("Löschen", onLoeschen, true)}
        </div>
      </PortalModalShell>
    </div>
  );
}
