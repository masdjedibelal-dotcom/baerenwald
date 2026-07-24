"use client";

import { useEffect, useRef, useState } from "react";

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
 * Listen-Aktionen Objektkarte: Primär „Aushang PDF“, Rest im ⋯-Popover.
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const item = (
    label: string,
    onClick: () => void,
    danger?: boolean
  ) => (
    <button
      type="button"
      className={cn(
        "block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold",
        danger
          ? "portal-danger hover:bg-[var(--p2-danger-soft)]"
          : "text-text-primary hover:bg-muted"
      )}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={rootRef}
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
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-[10px] border border-border-default bg-white py-1 shadow-lg">
          {canAushang && onQrCode ? item("QR-Code", onQrCode) : null}
          {item("Bearbeiten", onBearbeiten)}
          {item("Kopieren", onKopieren)}
          <div className="my-1 border-t border-border-default" />
          {item("Löschen", onLoeschen, true)}
        </div>
      ) : null}
    </div>
  );
}
