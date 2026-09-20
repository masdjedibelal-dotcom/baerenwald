"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { EMPTY } from "@/lib/portal-copy";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import {
  formatPortalNotifTime,
  type PortalNotifItem,
} from "@/lib/portal2/notif-types";
import { cn } from "@/lib/utils";

export type PortalNotificationBellProps = {
  items: PortalNotifItem[];
  unreadCount: number;
  loading?: boolean;
  /** „Alle ansehen“ — Mock immer sichtbar; ohne href nur Panel schließen */
  allHref?: string;
  onMarkAllRead: () => void | Promise<void>;
  /** Optional: Klick auf Eintrag (Partner Deep-Link etc.) */
  onItemActivate?: (item: PortalNotifItem) => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void | Promise<void>;
  /** Filter Offen/Erledigt (ungelesen/gelesen) */
  showReadFilter?: boolean;
};

type FilterId = "offen" | "erledigt";

function NotifList({
  items,
  loading,
  onItemActivate,
  onItem,
  emptyLabel = EMPTY.updates,
}: {
  items: PortalNotifItem[];
  loading: boolean;
  onItemActivate?: (item: PortalNotifItem) => void | Promise<void>;
  onItem: (n: PortalNotifItem) => void;
  emptyLabel?: string;
}) {
  if (loading && items.length === 0) {
    return (
      <p
        className="portal-text-meta px-5 py-10 text-center"
        style={{ color: "var(--p2-faint)" }}
      >
        Lädt…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p
        className="portal-text-meta px-5 py-10 text-center"
        style={{ color: "var(--p2-faint)" }}
      >
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="portal-notif-list">
      {items.map((n) => {
        const time = n.timeLabel || formatPortalNotifTime(n.createdAt);
        const rowClass = cn(
          "portal-notif-row",
          n.unread && "portal-notif-row--unread",
          (n.link || onItemActivate) && "portal-notif-row--active"
        );

        const inner = (
          <>
            <span className="min-w-0 flex-1">
              <span className="portal-notif-row__title">{n.titel}</span>
              {n.text?.trim() ? (
                <span className="portal-notif-row__text">{n.text}</span>
              ) : null}
              {time ? (
                <span className="portal-notif-row__time">{time}</span>
              ) : null}
            </span>
            {n.unread ? (
              <span
                className="portal-notif-row__dot"
                style={{ background: PORTAL_VAR.primary }}
                aria-label="Ungelesen"
              />
            ) : null}
          </>
        );

        return (
          <li key={n.id}>
            {onItemActivate ? (
              <PortalButton
                variant="ghost"
                action={false}
                type="button"
                className={rowClass}
                onClick={() => onItem(n)}
              >
                {inner}
              </PortalButton>
            ) : n.link ? (
              <Link href={n.link} className={rowClass} onClick={() => onItem(n)}>
                {inner}
              </Link>
            ) : (
              <div className={rowClass}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Glocke — Desktop: Popover; Mobile: Bottom-Card mit Filter Offen/Erledigt.
 */
export function PortalNotificationBell({
  items,
  unreadCount,
  loading = false,
  allHref,
  onMarkAllRead,
  onItemActivate,
  onOpenChange,
  onRefresh,
  showReadFilter = false,
}: PortalNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState<FilterId>("offen");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const setOpenSafe = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (next) {
        setFilter("offen");
        void onRefresh?.();
      }
    },
    [onOpenChange, onRefresh]
  );

  /* Modal via createPortal → Body: kein Outside-Click auf rootRef (würde jeden
   * Klick im Sheet inkl. „Alle gelesen“ als außen werten und schließen).
   * Schließen über PortalModalShell (Backdrop / Escape / X). */

  const filtered = useMemo(() => {
    if (!showReadFilter) return items;
    return filter === "offen"
      ? items.filter((n) => n.unread)
      : items.filter((n) => !n.unread);
  }, [items, filter, showReadFilter]);

  async function handleMarkAll() {
    if (unreadCount === 0 || marking) return;
    setMarking(true);
    try {
      await onMarkAllRead();
      /* Umschalten auf Erledigt — Panel offen lassen, Liste zeigt gelesene. */
      if (showReadFilter) setFilter("erledigt");
    } finally {
      setMarking(false);
    }
  }

  async function handleItem(n: PortalNotifItem) {
    if (onItemActivate) {
      await onItemActivate(n);
      setOpenSafe(false);
      return;
    }
    if (n.link) setOpenSafe(false);
  }

  const filterBar =
    showReadFilter ? (
      <div className="flex gap-2 px-4 pb-2 pt-1">
        {(
          [
            { id: "offen" as const, label: "Ungelesen" },
            { id: "erledigt" as const, label: "Gelesen" },
          ] as const
        ).map((f) => (
          <PortalButton
            variant="ghost"
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "portal-text-meta rounded-pill px-3 py-1.5 font-semibold",
              filter === f.id ? "text-white" : "border"
            )}
            style={
              filter === f.id
                ? { background: PORTAL_VAR.primary }
                : {
                    borderColor: "var(--p2-line)",
                    color: "var(--p2-sub)",
                    background: "var(--p2-panel)",
                  }
            }
          >
            {f.label}
          </PortalButton>
        ))}
      </div>
    ) : null;

  const footer = (
    <div
      className="px-4 py-[11px] text-center"
      style={{ borderTop: "0.0625rem solid var(--p2-line)" }}
    >
      {allHref ? (
        <Link
          href={allHref}
          onClick={() => setOpenSafe(false)}
          className="portal-text-meta font-semibold"
          style={{ color: "var(--org-primary, var(--p2-primary))" }}
        >
          Alle Vorgänge
        </Link>
      ) : (
        <PortalButton
          variant="ghost"
          type="button"
          onClick={() => setOpenSafe(false)}
          className="portal-text-meta font-semibold"
          style={{ color: "var(--org-primary, var(--p2-primary))" }}
        >
          Abbrechen
        </PortalButton>
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="portal-bell relative z-20 shrink-0 overflow-visible"
      data-portal-bell=""
    >
      <PortalButton
        variant="ghost"
        type="button"
        className="portal-bell-trigger relative grid place-items-center overflow-visible transition-colors"
        aria-label={
          unreadCount > 0
            ? `Benachrichtigungen, ${unreadCount} ungelesen`
            : "Benachrichtigungen"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenSafe(!open)}
      >
        <PortalIcon ctx="sidebar" n="bell" size={18} className="portal-bell-icon" />
      </PortalButton>
      {/* Außerhalb des Buttons — sonst clippt overflow/border-radius die Ecke. */}
      <PortalCountBadge count={unreadCount} variant="corner" />

      {open ? (
        <PortalModalShell
          open
          title="Updates"
          onClose={() => setOpenSafe(false)}
          variant="edit"
          closeOnBackdrop
        >
          <div id={panelId} className="flex min-h-0 flex-col">
            {unreadCount > 0 ? (
              <div className="mb-2 flex justify-end">
                <PortalButton
                  variant="ghost"
                  type="button"
                  disabled={marking}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleMarkAll();
                  }}
                  className="portal-text-meta font-semibold disabled:opacity-50"
                  style={{ color: "var(--org-primary, var(--p2-primary))" }}
                >
                  Alle gelesen
                </PortalButton>
              </div>
            ) : null}
            {filterBar}
            <div className="min-h-0 max-h-[min(70vh,520px)] flex-1 overflow-y-auto">
              <NotifList
                items={filtered}
                loading={loading}
                onItemActivate={onItemActivate}
                onItem={(n) => void handleItem(n)}
                emptyLabel={
                  showReadFilter
                    ? filter === "offen"
                      ? EMPTY.updatesUngelesen
                      : "Noch keine gelesenen Updates."
                    : EMPTY.updates
                }
              />
            </div>
            {footer}
          </div>
        </PortalModalShell>
      ) : null}
    </div>
  );
}
