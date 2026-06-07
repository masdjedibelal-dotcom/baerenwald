"use client";

import type { ReactNode } from "react";
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
  footer?: ReactNode;
  /** Farbiger Rand links (Standard: an). Im Partnerportal aus. */
  showLeftAccent?: boolean;
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
  footer,
  showLeftAccent = true,
}: PortalListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border border-border-light bg-surface-card text-left transition-colors",
        showLeftAccent ? "border-l-4 pl-3 sm:pl-4" : "px-3 sm:px-4",
        "pr-3 py-3.5 sm:pr-4 sm:py-4",
        showLeftAccent && ACCENT_CLASS[accent],
        selected
          ? "lg:border-border-default lg:bg-muted/55 lg:ring-1 lg:ring-border-default/80"
          : "hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="portal-text-card-title line-clamp-2">{title}</p>
          {subtitle ? (
            <p className="portal-text-meta mt-1 line-clamp-1 text-text-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className={cn("shrink-0", statusPillClass)}>{statusLabel}</span>
      </div>

      {meta.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {meta.map((m, i) => {
            const Icon = m.icon ?? Hammer;
            return (
              <li
                key={`${m.text}-${i}`}
                className="portal-text-meta flex items-center gap-2 text-text-secondary"
              >
                <Icon className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
                <span className="truncate">{m.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}

      {hint ? (
        <p className="portal-text-meta mt-2.5 font-medium text-accent">{hint}</p>
      ) : null}
    </button>
  );
}

export { Calendar, Hammer, MapPin };
