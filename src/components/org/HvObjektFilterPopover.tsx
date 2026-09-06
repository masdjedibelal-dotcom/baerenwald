"use client";

import { Check, Home } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type HvObjektFilterOption = {
  id: string;
  titel: string;
};

type Props = {
  objekte: HvObjektFilterOption[];
  /** Leer / alle IDs = kein Filter (alle Objekte). */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

function labelForSelection(
  objekte: HvObjektFilterOption[],
  selectedIds: string[]
): string {
  if (
    selectedIds.length === 0 ||
    selectedIds.length >= objekte.length
  ) {
    return "Alle Objekte";
  }
  if (selectedIds.length === 1) {
    const hit = objekte.find((o) => o.id === selectedIds[0]);
    return hit?.titel?.trim() || "1 Objekt";
  }
  return `${selectedIds.length} Objekte`;
}

/**
 * HV Vorgänge: Objekt-Filter (Popover, Mehrfachauswahl).
 * Trigger: Haus-Icon rechts (gleiche Chip-Höhe wie Status-Filter).
 * Nur anzeigen wenn `objekte.length > 1`.
 */
export function HvObjektFilterPopover({
  objekte,
  selectedIds,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const allSelected =
    selectedIds.length === 0 || selectedIds.length >= objekte.length;
  const active = !allSelected;
  const label = labelForSelection(objekte, selectedIds);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectAll() {
    onChange([]);
  }

  function toggleOne(id: string) {
    if (allSelected) {
      onChange([id]);
      return;
    }
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const next = Array.from(set);
    if (next.length === 0 || next.length >= objekte.length) {
      onChange([]);
      return;
    }
    onChange(next);
  }

  if (objekte.length <= 1) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", open && "z-50")}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "portal-liste-chip portal-liste-chip--icon",
          active && "portal-liste-chip--active"
        )}
      >
        <Home className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        {!allSelected ? (
          <span
            className="portal-liste-chip-badge"
            style={{
              color: active ? PORTAL_VAR.greenDark : "#1a2e1f",
              background: active ? "#fff" : "var(--p2-sand, #e8b04b)",
            }}
            aria-hidden
          >
            {selectedIds.length === 1 ? "1" : String(selectedIds.length)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label="Objekte filtern"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-[12px] border border-border-default bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] sm:left-0 sm:right-auto"
        >
          <p className="border-b border-border-light px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
            Objekte
          </p>
          <ul className="max-h-[min(50vh,320px)] overflow-y-auto py-1">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={allSelected}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/60"
                onClick={selectAll}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border",
                    allSelected
                      ? "border-accent bg-accent text-white"
                      : "border-border-default bg-white"
                  )}
                  aria-hidden
                >
                  {allSelected ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="portal-text-body font-semibold text-text-primary">
                  Alle Objekte
                </span>
              </button>
            </li>
            {objekte.map((o) => {
              const checked =
                !allSelected && selectedIds.includes(o.id);
              const titel = o.titel.trim() || "Objekt";
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/60"
                    onClick={() => toggleOne(o.id)}
                  >
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border",
                        checked
                          ? "border-accent bg-accent text-white"
                          : "border-border-default bg-white"
                      )}
                      aria-hidden
                    >
                      {checked ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="portal-text-body min-w-0 flex-1 truncate text-text-primary">
                      {titel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
