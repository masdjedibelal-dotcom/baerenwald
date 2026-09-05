"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Hammer,
  MapPin,
} from "lucide-react";

import {
  portalListItemBorderStyle,
  portalListItemClass,
  type PortalListVariant,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";
import { cn } from "@/lib/utils";

export type PortalListCardAccent = "anfrage" | "angebot" | "auftrag";

/** String-Keys — Lucide-Komponenten dürfen nicht Server→Client serialisiert werden. */
export type PortalListCardMetaIcon =
  | "map-pin"
  | "calendar"
  | "hammer"
  | "alert-triangle";

export type PortalListCardMeta = {
  icon?: PortalListCardMetaIcon;
  text: string;
};

const META_ICONS: Record<PortalListCardMetaIcon, LucideIcon> = {
  "map-pin": MapPin,
  calendar: Calendar,
  hammer: Hammer,
  "alert-triangle": AlertTriangle,
};

/** @deprecated Prefer PortalListVariant from layout-chrome */
export type PortalListCardVariant = PortalListVariant;

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
  /**
   * Footer-Aktionen mit stopPropagation (z. B. Aushang ⋯).
   * Wird unter dem Content gerendert; `footer` bleibt parallel nutzbar.
   */
  trailingActions?: ReactNode;
  /** Cover oben (card/responsive) bzw. links bei row. */
  media?: ReactNode;
  /** Farbiger Rand links (nur Variant row). */
  showLeftAccent?: boolean;
  /** Mock-Liste: Chevron rechts */
  showChevron?: boolean;
  /**
   * `responsive` = weiße Karte (Default, wie CRM Mobil).
   * `card` = identisch · `row` = flache Zeile in Panel.
   */
  variant?: PortalListVariant;
  /** Checkbox links (Mock) — Klick stoppt Propagation. */
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Attention-Badge (z. B. ungelesene Updates) — oben rechts, rot/weiß */
  attentionBadge?: number | null;
};

const ACCENT_CLASS: Record<PortalListCardAccent, string> = {
  anfrage: "border-l-amber-500",
  angebot: "border-l-emerald-600",
  auftrag: "border-l-blue-600",
};

function StatusWord({
  statusLabel,
  statusPillClass,
  statusPillStyle,
}: {
  statusLabel: string;
  statusPillClass: string;
  statusPillStyle?: { color: string; backgroundColor: string };
}) {
  if (!statusLabel.trim()) return null;
  return (
    <span
      className={cn(
        "portal-status-word",
        !statusPillStyle && statusPillClass
      )}
      style={
        statusPillStyle
          ? { color: statusPillStyle.color }
          : undefined
      }
    >
      {statusLabel}
    </span>
  );
}

function TrailingActionsSlot({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

/** Klassische Notif-Badge: oben rechts, rot mit weißer Zahl. */
function AttentionCornerBadge({ count }: { count: number }) {
  return <PortalCountBadge count={count} variant="corner" className="z-10" />;
}

/**
 * Vorgangs-Listenzeile — C1: weiße Karte auf Page-BG (`card` / `responsive`).
 */
export function PortalListCard({
  selected,
  onClick,
  title,
  subtitle,
  idLabel: _idLabel,
  statusLabel,
  statusPillClass,
  statusPillStyle,
  accent,
  meta,
  hint,
  footer,
  trailingActions,
  media,
  showLeftAccent = true,
  showChevron = false,
  variant = "responsive",
  showCheckbox = false,
  checked = false,
  onCheckedChange,
  attentionBadge,
}: PortalListCardProps) {
  const showAttention = Boolean(attentionBadge && attentionBadge > 0);

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative",
          portalListItemClass("row", { selected }),
          showLeftAccent ? "border-l-4 pl-3 sm:pl-4" : "px-4",
          showLeftAccent && ACCENT_CLASS[accent],
          media && "flex items-start gap-3"
        )}
      >
        {showAttention ? (
          <AttentionCornerBadge count={attentionBadge!} />
        ) : null}
        {media ? (
          <div
            className="w-20 shrink-0 overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {media}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Deep Green: Vorgangsnummer (idLabel) entfällt in Listen */}
              <StatusWord
                statusLabel={statusLabel}
                statusPillClass={statusPillClass}
                statusPillStyle={statusPillStyle}
              />
              <p className="portal-text-card-title mt-1 line-clamp-2">{title}</p>
              {subtitle ? (
                <p className="portal-text-meta mt-1 line-clamp-2 text-text-secondary">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-center pt-3.5">
              {showChevron ? (
                <ChevronRight
                  className="h-5 w-5 text-[var(--p2-faint2,#9aa39e)]"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>

          {meta.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {meta.map((m, i) => {
                const Icon = m.icon ? META_ICONS[m.icon] : null;
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
          {trailingActions ? (
            <TrailingActionsSlot>{trailingActions}</TrailingActionsSlot>
          ) : null}
          {hint ? (
            <p className="portal-text-meta mt-2 text-text-tertiary">{hint}</p>
          ) : null}
        </div>
      </button>
    );
  }

  // card | responsive
  const isCardShell = variant === "card" || variant === "responsive";
  const hasMedia = Boolean(media);
  const responsiveMedia = variant === "responsive" && hasMedia;

  return (
    <div
      className={cn(
        "relative",
        portalListItemClass(variant, { selected }),
        hasMedia && variant === "card" && "flex-col !gap-0 overflow-hidden !p-0",
        responsiveMedia &&
          "flex-col !gap-0 overflow-hidden !p-0 lg:flex-row lg:items-stretch lg:!gap-3 lg:!p-0 lg:pl-0"
      )}
      style={isCardShell ? portalListItemBorderStyle(variant) : undefined}
    >
      {showAttention ? (
        <AttentionCornerBadge count={attentionBadge!} />
      ) : null}
      {hasMedia ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden",
            variant === "card" &&
              "h-[140px] w-full [&>div]:h-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover",
            responsiveMedia &&
              "h-[140px] w-full [&>div]:h-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover lg:h-auto lg:w-24 lg:self-stretch lg:rounded-none lg:[&>div]:h-full lg:[&>div]:min-h-[4.5rem] lg:[&>div]:rounded-none"
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {media}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full items-stretch gap-3.5",
          hasMedia && variant === "card" && "px-4 py-[15px]",
          responsiveMedia &&
            "px-4 py-[15px] lg:min-w-0 lg:flex-1 lg:py-[15px] lg:pr-4 lg:pl-0"
        )}
      >
        {showCheckbox ? (
          <input
            type="checkbox"
            className="mt-1.5 h-4 w-4 shrink-0 rounded border-gray-300"
            checked={checked}
            onChange={(e) => {
              e.stopPropagation();
              onCheckedChange?.(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Auswählen: ${title}`}
          />
        ) : null}

        {!hasMedia ? (
          <span className="portal-list-card-edge" aria-hidden />
        ) : null}

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onClick}
            className="flex w-full min-w-0 items-start gap-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <StatusWord
                statusLabel={statusLabel}
                statusPillClass={statusPillClass}
                statusPillStyle={statusPillStyle}
              />
              <p
                className="portal-list-card-title mt-1 line-clamp-2"
                style={{ color: PORTAL_VAR.ink }}
              >
                {title}
              </p>
              {subtitle ? (
                <p
                  className="portal-list-card-sub mt-1 line-clamp-2"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  {subtitle}
                </p>
              ) : null}
              {meta.length > 0 ? (
                <p
                  className="portal-list-card-meta mt-1.5 line-clamp-2"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {meta.map((m) => m.text).join(" · ")}
                </p>
              ) : null}
              {hint ? (
                <p
                  className="portal-list-card-meta mt-1.5"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {hint}
                </p>
              ) : null}
            </div>

            {showChevron ? (
              <ChevronRight
                className="portal-list-card-chevron shrink-0"
                aria-hidden
              />
            ) : null}
          </button>

          {footer ? <div className="mt-2">{footer}</div> : null}
          {trailingActions ? (
            <TrailingActionsSlot>{trailingActions}</TrailingActionsSlot>
          ) : null}
        </div>
      </div>
    </div>
  );
}
