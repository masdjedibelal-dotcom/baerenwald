"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

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
  /** Kurz-ID über dem Titel (Mock V-xxxx / Lead-Präfix) */
  idLabel?: string;
  statusLabel: string;
  statusPillClass: string;
  /** Optional: Mock-Status-Farben als inline style */
  statusPillStyle?: { color: string; backgroundColor: string };
  accent: PortalListCardAccent;
  meta: PortalListCardMeta[];
  hint?: string;
  footer?: ReactNode;
  /** Farbiger Rand links (Standard: an). Im Partnerportal aus. */
  showLeftAccent?: boolean;
  /** Mock-Liste: Chevron rechts */
  showChevron?: boolean;
};

const ACCENT_CLASS: Record<PortalListCardAccent, string> = {
  anfrage: "border-l-amber-500",
  angebot: "border-l-emerald-600",
  auftrag: "border-l-blue-600",
};

/**
 * Listenzeile im Mock-Stil — Hairline-Trenner, optional ID + Chevron.
 */
export function PortalListCard({
  selected,
  onClick,
  title,
  subtitle,
  idLabel,
  statusLabel,
  statusPillClass,
  statusPillStyle,
  accent,
  meta,
  hint,
  footer,
  showLeftAccent = true,
  showChevron = false,
}: PortalListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left transition-colors",
        showLeftAccent ? "border-l-4 pl-3 sm:pl-4" : "px-4",
        "pr-3 py-3.5 sm:pr-4 sm:py-3.5",
        showLeftAccent && ACCENT_CLASS[accent],
        selected ? "bg-[#f0f2f0]" : "bg-transparent hover:bg-[#f7f8fa]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {idLabel ? (
            <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
              {idLabel}
            </p>
          ) : null}
          <p className="portal-text-card-title line-clamp-2">{title}</p>
          {subtitle ? (
            <p className="portal-text-meta mt-1 line-clamp-2 text-text-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              !statusPillStyle && statusPillClass
            )}
            style={statusPillStyle}
          >
            {statusLabel}
          </span>
          {showChevron ? (
            <ChevronRight
              className="h-4 w-4 text-text-tertiary"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {meta.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {meta.map((m, i) => {
            const Icon = m.icon;
            return (
              <li
                key={`${m.text}-${i}`}
                className="portal-text-meta flex items-center gap-2 text-text-secondary"
              >
                {Icon ? (
                  <Icon
                    className="h-4 w-4 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{m.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {footer ? <div className="mt-2">{footer}</div> : null}

      {hint ? (
        <p className="portal-text-meta mt-2 text-text-tertiary">{hint}</p>
      ) : null}
    </button>
  );
}
