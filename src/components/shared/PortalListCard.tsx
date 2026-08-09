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
   * `responsive` = mobile card / lg+ flat (C1 Default).
   * `card` = immer Karte · `row` = immer flache Zeile.
   */
  variant?: PortalListVariant;
  /** Checkbox links (Mock) — Klick stoppt Propagation. */
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Attention-Badge (z. B. ungelesenes Bautagebuch) */
  attentionBadge?: number | null;
};

const ACCENT_CLASS: Record<PortalListCardAccent, string> = {
  anfrage: "border-l-amber-500",
  angebot: "border-l-emerald-600",
  auftrag: "border-l-blue-600",
};

function StatusPill({
  statusLabel,
  statusPillClass,
  statusPillStyle,
}: {
  statusLabel: string;
  statusPillClass: string;
  statusPillStyle?: { color: string; backgroundColor: string };
}) {
  return (
    <span
      className={cn(
        "portal-status-pill",
        !statusPillStyle && statusPillClass
      )}
      style={statusPillStyle}
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

/**
 * Vorgangs-Listenzeile — C1: mobile card / lg+ flat bei `responsive`.
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
  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          portalListItemClass("row", { selected }),
          showLeftAccent ? "border-l-4 pl-3 sm:pl-4" : "px-4",
          showLeftAccent && ACCENT_CLASS[accent],
          media && "flex items-start gap-3"
        )}
      >
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
              {idLabel ? (
                <p className="portal-text-label mb-0.5 normal-case tracking-wide text-text-tertiary">
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
              {attentionBadge && attentionBadge > 0 ? (
                <span
                  className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold"
                  style={{
                    background: PORTAL_VAR.dangerSoft,
                    color: PORTAL_VAR.danger,
                  }}
                  title="Neues Bautagebuch"
                >
                  {attentionBadge > 9 ? "9+" : attentionBadge}
                </span>
              ) : null}
              <StatusPill
                statusLabel={statusLabel}
                statusPillClass={statusPillClass}
                statusPillStyle={statusPillStyle}
              />
              {showChevron ? (
                <ChevronRight
                  className="h-5 w-5 text-text-tertiary"
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

  return (
    <div
      className={cn(
        portalListItemClass(variant, { selected }),
        hasMedia && "flex-col !gap-0 overflow-hidden !p-0"
      )}
      style={isCardShell ? portalListItemBorderStyle(variant) : undefined}
    >
      {hasMedia ? (
        <div
          className="w-full shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {media}
        </div>
      ) : null}

      <div
        className={cn(
          "flex w-full items-start gap-3",
          hasMedia && "px-3.5 py-3.5 sm:px-4"
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

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onClick}
            className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
          >
            <div className="min-w-0 flex-1">
              {idLabel ? (
                <p
                  className="portal-text-label mb-0.5 normal-case tracking-wide"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {idLabel}
                </p>
              ) : null}
              <p
                className="portal-text-card-title line-clamp-2"
                style={{ color: PORTAL_VAR.ink }}
              >
                {title}
              </p>
              {subtitle ? (
                <p
                  className="portal-text-meta mt-1 line-clamp-2"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  {subtitle}
                </p>
              ) : null}
              {meta.length > 0 ? (
                <p
                  className="portal-text-meta mt-1.5 line-clamp-2"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {meta.map((m) => m.text).join(" · ")}
                </p>
              ) : null}
              {hint ? (
                <p
                  className="portal-text-meta mt-1.5"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {hint}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              {attentionBadge && attentionBadge > 0 ? (
                <span
                  className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold"
                  style={{
                    background: PORTAL_VAR.dangerSoft,
                    color: PORTAL_VAR.danger,
                  }}
                  title="Neues Bautagebuch"
                >
                  {attentionBadge > 9 ? "9+" : attentionBadge}
                </span>
              ) : null}
              <StatusPill
                statusLabel={statusLabel}
                statusPillClass={statusPillClass}
                statusPillStyle={statusPillStyle}
              />
              {showChevron ? (
                <ChevronRight
                  className="h-5 w-5 shrink-0"
                  style={{ color: PORTAL_VAR.faint2 }}
                  aria-hidden
                />
              ) : null}
            </div>
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
