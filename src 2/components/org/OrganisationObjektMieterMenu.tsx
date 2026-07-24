"use client";

import { useEffect, useRef, useState } from "react";

import { OBJ_MIETER_MENU } from "@/lib/portal2/objekte";
import { cn } from "@/lib/utils";

type Props = {
  hasEmail?: boolean;
  onEinladen: () => void;
  onVorgaenge: () => void;
  onEntfernen: () => void;
  onBearbeiten?: () => void;
};

/**
 * Mock `objMieterMenu` — Einladen / Entfernen / Vorgänge.
 */
export function OrganisationObjektMieterMenu({
  hasEmail,
  onEinladen,
  onVorgaenge,
  onEntfernen,
  onBearbeiten,
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
          ? "text-[#B42318] hover:bg-[#FEF3F2]"
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-base text-text-secondary"
        aria-label="Mieter-Menü"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-[10px] border border-border-default bg-white py-1 shadow-lg">
          {item(
            hasEmail ? OBJ_MIETER_MENU.erneut : OBJ_MIETER_MENU.einladen,
            onEinladen
          )}
          {item(OBJ_MIETER_MENU.bearbeiten, () => onBearbeiten?.())}
          {item(OBJ_MIETER_MENU.vorgaenge, onVorgaenge)}
          <div className="my-1 border-t border-border-default" />
          {item(OBJ_MIETER_MENU.entfernen, onEntfernen, true)}
        </div>
      ) : null}
    </div>
  );
}
