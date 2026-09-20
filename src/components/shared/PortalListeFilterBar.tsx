"use client";
import { PALETTE } from "@/lib/tokens/palette";
import { PortalButton } from "@/components/portal/PortalButton";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { PortalListeFilterChip } from "@/components/shared/PortalListeChrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type PortalListeFilterOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
  countBadge?: number | null;
};

export type PortalListeMultiSelectOption = {
  id: string;
  label: string;
};

export type PortalListeMultiSelect = {
  options: readonly PortalListeMultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Default: „Alle …“ */
  allLabel?: string;
  /** Popover-Titel */
  title?: string;
  /** aria/title wenn gefiltert */
  icon?: "home";
};

type Props<T extends string> = {
  value: T;
  onChange: (id: T) => void;
  options: readonly PortalListeFilterOption<T>[];
  /** @deprecated Sheet-Titel — Chips werden überall gezeigt. */
  sheetTitle?: string;
  /** Optional: Mehrfachauswahl-Popover rechts (z. B. HV Objekte). */
  multiSelect?: PortalListeMultiSelect;
  className?: string;
};

function multiSelectLabel(
  options: readonly PortalListeMultiSelectOption[],
  selectedIds: string[],
  allLabel: string
): string {
  if (
    selectedIds.length === 0 ||
    selectedIds.length >= options.length
  ) {
    return allLabel;
  }
  if (selectedIds.length === 1) {
    const hit = options.find((o) => o.id === selectedIds[0]);
    return hit?.label?.trim() || "1 Objekt";
  }
  return `${selectedIds.length} Objekte`;
}

function PortalListeMultiSelectPopover({
  options,
  selectedIds,
  onChange,
  allLabel = "Alle Objekte",
  title = "Objekte",
}: PortalListeMultiSelect) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const allSelected =
    selectedIds.length === 0 || selectedIds.length >= options.length;
  const active = !allSelected;
  const label = multiSelectLabel(options, selectedIds, allLabel);

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
    if (next.length === 0 || next.length >= options.length) {
      onChange([]);
      return;
    }
    onChange(next);
  }

  if (options.length <= 1) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", open && "z-50")}
    >
      <PortalButton variant="ghost"
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
        <PortalIcon n="home" ctx="default" className="h-4 w-4 shrink-0" aria-hidden />
        {!allSelected ? (
          <span
            className="portal-liste-chip-badge"
            style={{
              color: active ? PORTAL_VAR.greenDark : PALETTE.h1a2e1f,
              background: active ? "var(--p2-panel)" : "var(--p2-sand)",
            }}
            aria-hidden
          >
            {selectedIds.length === 1 ? "1" : String(selectedIds.length)}
          </span>
        ) : null}
      </PortalButton>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label={title}
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-[12px] border border-border-default bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] sm:left-0 sm:right-auto"
        >
          <p className="border-b border-border-light px-3.5 py-2.5 text-fs-caption font-bold uppercase tracking-wide text-text-tertiary">
            {title}
          </p>
          <ul className="max-h-[min(50vh,320px)] overflow-y-auto py-1">
            <li>
              <PortalButton variant="primary"
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
                    <PortalIcon n="check" ctx="default" className="h-3 w-3" />
                  ) : null}
                </span>
                <span className="portal-text-body font-semibold text-text-primary">
                  {allLabel}
                </span>
              </PortalButton>
            </li>
            {options.map((o) => {
              const checked =
                !allSelected && selectedIds.includes(o.id);
              const titel = o.label.trim() || "Objekt";
              return (
                <li key={o.id}>
                  <PortalButton variant="primary"
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
                        <PortalIcon n="check" ctx="default" className="h-3 w-3" />
                      ) : null}
                    </span>
                    <span className="portal-text-body min-w-0 flex-1 truncate text-text-primary">
                      {titel}
                    </span>
                  </PortalButton>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Vorgänge-Filter: Chip-Reihe auf Desktop und Mobil (horizontal scrollbar).
 * Optional: Mehrfachauswahl-Popover rechts (HV Objekte).
 */
export function PortalListeFilterBar<T extends string>({
  value,
  onChange,
  options,
  multiSelect,
  className,
}: Props<T>) {
  const hasMulti =
    Boolean(multiSelect) && (multiSelect?.options.length ?? 0) > 1;

  return (
    <div
      className={cn(
        "relative z-30 -mx-1 flex items-center gap-2 px-1 py-3.5",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !hasMulti && "-mx-0"
        )}
      >
        {options.map((opt) => (
          <PortalListeFilterChip
            key={opt.id}
            active={opt.id === value}
            onClick={() => onChange(opt.id)}
            count={opt.count}
            countBadge={opt.countBadge}
          >
            {opt.label}
          </PortalListeFilterChip>
        ))}
      </div>
      {hasMulti && multiSelect ? (
        <div className="shrink-0">
          <PortalListeMultiSelectPopover {...multiSelect} />
        </div>
      ) : null}
    </div>
  );
}

/** Hilfs-Wrapper — API-Kompatibilität. */
export function PortalListeFilterSheetHint({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
