"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { PortalListeFilterChip } from "@/components/shared/PortalListeChrome";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type PortalListeFilterOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
  countBadge?: number | null;
};

type Props<T extends string> = {
  value: T;
  onChange: (id: T) => void;
  options: readonly PortalListeFilterOption<T>[];
  /** Sheet-Titel mobil. Default „Filter“. */
  sheetTitle?: string;
  className?: string;
};

/**
 * Desktop: Chip-Reihe.
 * Mobil: ein „Filter“-Button → ActionSheet (`confirm`) — App-Muster.
 */
export function PortalListeFilterBar<T extends string>({
  value,
  onChange,
  options,
  sheetTitle = "Filter",
  className,
}: Props<T>) {
  const mobile = useIsPortalMobile();
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.id === value);

  if (!mobile) {
    return (
      <div className={cn("flex flex-wrap gap-2 py-3.5", className)}>
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
    );
  }

  return (
    <div className={cn("py-2", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[13px] font-semibold"
        style={{
          borderColor: PORTAL_VAR.line,
          background: "#fff",
          color: PORTAL_VAR.ink,
        }}
      >
        <SlidersHorizontal
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: PORTAL_VAR.faint }}
          aria-hidden
        />
        <span className="truncate">
          {active?.label ?? sheetTitle}
          {active?.count != null ? (
            <span
              className="ml-1 font-normal"
              style={{ color: PORTAL_VAR.faint }}
            >
              ({active.count})
            </span>
          ) : null}
        </span>
        <span
          className="shrink-0 text-[11.5px] font-semibold"
          style={{ color: PORTAL_VAR.primary }}
        >
          Ändern
        </span>
      </button>

      <PortalModalShell
        open={open}
        title={sheetTitle}
        onClose={() => setOpen(false)}
        variant="confirm"
        maxWidth={400}
      >
        <div className="flex flex-col gap-1">
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] px-3.5 py-3 text-left text-[14px] font-semibold",
                  selected ? "bg-[var(--p2-primary-soft)]" : "hover:bg-muted"
                )}
                style={{ color: selected ? PORTAL_VAR.primary : PORTAL_VAR.ink }}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.count != null ? (
                  <span
                    className="text-[12.5px] font-semibold"
                    style={{ color: PORTAL_VAR.faint }}
                  >
                    {opt.count}
                  </span>
                ) : null}
                {opt.countBadge != null && opt.countBadge > 0 ? (
                  <span
                    className="rounded-full px-1.5 py-px text-[10.5px] font-bold text-white"
                    style={{ background: PORTAL_VAR.primary }}
                  >
                    {opt.countBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </PortalModalShell>
    </div>
  );
}

/** Hilfs-Wrapper wenn nur Chips als children gebaut wurden — nicht nötig bei Bar. */
export function PortalListeFilterSheetHint({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
