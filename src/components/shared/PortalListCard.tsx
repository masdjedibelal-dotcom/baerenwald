"use client";

import type { LucideIcon } from "lucide-react";
import { Calendar, Hammer, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

export type PortalListCardAccent = "anfrage" | "angebot" | "auftrag";

export type PortalListCardMeta = {
  icon?: LucideIcon;
  text: string;
};

export type PortalListCardProps = {
  selected?: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusPillClass: string;
  accent: PortalListCardAccent;
  meta: PortalListCardMeta[];
  hint?: string;
};

const ACCENT_CLASS: Record<PortalListCardAccent, string> = {
  anfrage: "border-l-amber-500",
  angebot: "border-l-emerald-600",
  auftrag: "border-l-blue-600",
};

export function PortalListCard({
  selected,
  onClick,
  title,
  subtitle,
  statusLabel,
  statusPillClass,
  accent,
  meta,
  hint,
}: PortalListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border border-border-light bg-surface-card text-left transition-colors",
        "border-l-4 pl-3 pr-3 py-3 sm:pl-4 sm:pr-4",
        ACCENT_CLASS[accent],
        selected
          ? "border-accent/40 bg-accent-light/60 ring-1 ring-accent/25"
          : "hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        <span className={cn("shrink-0", statusPillClass)}>{statusLabel}</span>
      </div>

      {meta.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {meta.map((m, i) => {
            const Icon = m.icon ?? Hammer;
            return (
              <li
                key={`${m.text}-${i}`}
                className="flex items-center gap-1.5 text-xs text-text-secondary"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                <span className="truncate">{m.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hint ? <p className="mt-2 text-xs font-medium text-accent">{hint}</p> : null}
    </button>
  );
}

export { Calendar, Hammer, MapPin };
