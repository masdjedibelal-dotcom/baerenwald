'use client';

import { PortalIcon } from "@/components/portal/PortalIcon";
import type { ReactNode } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { PortalCheckbox } from "@/components/shared/PortalFormControls";
import {
  portalListItemBorderStyle,
  portalListItemClass,
  type PortalListVariant,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";
import { cn } from "@/lib/utils";

export type PortalListCardAccent = "anfrage" | "angebot" | "auftrag";

/** String-Keys — PortalIcon `n` (keine Lucide-Komponenten Server→Client). */
export type PortalListCardMetaIcon =
  | "map-pin"
  | "calendar"
  | "hammer"
  | "alert-triangle";

export type PortalListCardMeta = {
  icon?: PortalListCardMetaIcon;
  text: string;
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
   * Nur setzen, wenn echte Zusatzaktionen nötig sind — nicht nur „Öffnen“.
   */
  trailingActions?: ReactNode;
  /** Cover oben (card/responsive) bzw. links bei row. */
  media?: ReactNode;
  /** Farbiger Rand links (nur Variant row). */
  showLeftAccent?: boolean;
  /** Mock-Liste: Chevron rechts */
  showChevron?: boolean;
  /**
   * `responsive` = weiße Karte (Default, wie CRM Mobil / Dashboard „Zuletzt“).
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
      className={cn("portal-status-word", !statusPillStyle && statusPillClass)}
      style={statusPillStyle ? { color: statusPillStyle.color } : undefined}
    >
      {statusLabel}
    </span>
  );
}

/**
 * Vorgangs-Listenzeile — flache weiße App-Karte (Parität Dashboard „Zuletzt“).
 * Kein verschachtelter Ghost-Button (sonst Doppel-Rand), kein Pflicht-⋯.
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
  void _idLabel;
  const showAttention = Boolean(attentionBadge && attentionBadge > 0);
  const metaLine =
    meta.length > 0 ? meta.map((m) => m.text).join(" · ") : null;
  const subLine = subtitle?.trim() || metaLine;

  if (variant === "row") {
    return (
      <PortalButton
        variant="ghost"
        action={false}
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
          <PortalCountBadge count={attentionBadge!} variant="corner" className="z-10" />
        ) : null}
        {media ? (
          <div
            className="w-20 shrink-0 overflow-hidden rounded-card"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {media}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <StatusWord
                statusLabel={statusLabel}
                statusPillClass={statusPillClass}
                statusPillStyle={statusPillStyle}
              />
              <p className="portal-text-card-title mt-1 line-clamp-2">{title}</p>
              {subLine ? (
                <p className="portal-text-meta mt-1 line-clamp-2 text-text-secondary">
                  {subLine}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-center pt-3.5">
              {showChevron ? (
                <PortalIcon
                  n="chevron-right"
                  ctx="muted"
                  className="h-5 w-5 text-[var(--p2-faint2)]"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
          {footer ? <div className="mt-2">{footer}</div> : null}
          {trailingActions ? (
            <div
              className="mt-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {trailingActions}
            </div>
          ) : null}
          {hint ? (
            <p className="portal-text-meta mt-2 text-text-tertiary">{hint}</p>
          ) : null}
        </div>
      </PortalButton>
    );
  }

  // card | responsive — eine flache App-Karte wie „Zuletzt“
  const hasMedia = Boolean(media);
  const responsiveMedia = variant === "responsive" && hasMedia;

  return (
    <div
      className={cn(
        "relative",
        portalListItemClass(variant, { selected }),
        "portal-list-card--flat",
        !hasMedia && "portal-list-card--padded",
        hasMedia && variant === "card" && "flex-col !gap-0 overflow-hidden !p-0",
        responsiveMedia &&
          "flex-col !gap-0 overflow-hidden !p-0 lg:flex-row lg:items-stretch lg:!gap-3 lg:!p-0 lg:pl-0"
      )}
      style={portalListItemBorderStyle(variant)}
    >
      {showAttention ? (
        <PortalCountBadge count={attentionBadge!} variant="corner" className="z-10" />
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
          "flex w-full min-w-0 items-stretch gap-3",
          hasMedia && variant === "card" && "px-4 py-4",
          responsiveMedia &&
            "px-4 py-4 lg:min-w-0 lg:flex-1 lg:py-4 lg:pr-4 lg:pl-0"
        )}
      >
        {showCheckbox ? (
          <PortalCheckbox
            className="mt-1.5 h-4 w-4 shrink-0 rounded-card border-p2-line"
            checked={checked}
            onChange={(e) => {
              e.stopPropagation();
              onCheckedChange?.(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Auswählen: ${title}`}
          />
        ) : null}

        {!hasMedia ? <span className="portal-list-card-edge" aria-hidden /> : null}

        <PortalButton
          variant="ghost"
          action={false}
          type="button"
          onClick={onClick}
          className="portal-list-card-main flex min-w-0 flex-1 items-center gap-3 text-left"
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
            {subLine ? (
              <p
                className="portal-list-card-sub mt-1 line-clamp-2"
                style={{ color: PORTAL_VAR.sub }}
              >
                {subLine}
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
            {footer ? <div className="mt-2">{footer}</div> : null}
          </div>

          {showChevron ? (
            <PortalIcon
              n="chevron-right"
              ctx="row"
              className="portal-list-card-chevron shrink-0"
              aria-hidden
            />
          ) : null}
        </PortalButton>

        {trailingActions ? (
          <div
            className="portal-list-card-actions flex shrink-0 items-start self-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {trailingActions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
