"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MockIcon } from "@/components/shared/MockIcon";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import {
  formatPortalNotifTime,
  type PortalNotifItem,
} from "@/lib/portal2/notif-types";
import { cn } from "@/lib/utils";

/** Mock badge `#D93B3B` */
const NOTIF_BADGE = "#D93B3B";

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
  /** Partner: Filter Offen/Erledigt (Default: an) */
  showReadFilter?: boolean;
};

type FilterId = "offen" | "erledigt";

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

function NotifList({
  items,
  loading,
  onItemActivate,
  onItem,
}: {
  items: PortalNotifItem[];
  loading: boolean;
  onItemActivate?: (item: PortalNotifItem) => void | Promise<void>;
  onItem: (n: PortalNotifItem) => void;
}) {
  if (loading && items.length === 0) {
    return (
      <p
        className="px-5 py-[34px] text-center text-[13px]"
        style={{ color: "var(--p2-faint)" }}
      >
        Laden…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p
        className="px-5 py-[34px] text-center text-[13px]"
        style={{ color: "var(--p2-faint)" }}
      >
        Keine Benachrichtigungen
      </p>
    );
  }
  return (
    <ul>
      {items.map((n, i) => {
        const time = n.timeLabel || formatPortalNotifTime(n.createdAt);
        const rowStyle = {
          display: "flex" as const,
          gap: 12,
          padding: "13px 16px",
          borderBottom:
            i < items.length - 1 ? "1px solid var(--p2-line)" : "none",
          background: n.unread
            ? "rgba(46,125,82,0.04)"
            : "var(--p2-panel)",
          cursor: n.link || onItemActivate ? "pointer" : "default",
          width: "100%" as const,
          textAlign: "left" as const,
        };

        const inner = (
          <>
            <span
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[15px]"
              style={{ background: n.iconBg, color: n.iconFg }}
              aria-hidden
            >
              <MockIcon
                ctx="row"
                glyph={n.glyph}
                size={16}
                style={{ color: n.iconFg }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-[7px]">
                <span
                  className="truncate text-[13.5px] font-semibold"
                  style={{ color: "var(--p2-ink)" }}
                >
                  {n.titel}
                </span>
                {n.unread ? (
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ background: PORTAL_VAR.primary }}
                    aria-label="Ungelesen"
                  />
                ) : null}
              </span>
              <span
                className="mt-0.5 mb-1 block text-[12.5px] leading-[1.45]"
                style={{ color: "var(--p2-sub)" }}
              >
                {n.text}
              </span>
              <span
                className="block text-[11.5px]"
                style={{ color: "var(--p2-faint)" }}
              >
                {time}
              </span>
            </span>
          </>
        );

        return (
          <li key={n.id}>
            {onItemActivate ? (
              <button type="button" style={rowStyle} onClick={() => onItem(n)}>
                {inner}
              </button>
            ) : n.link ? (
              <Link href={n.link} style={rowStyle} onClick={() => onItem(n)}>
                {inner}
              </Link>
            ) : (
              <div style={rowStyle}>{inner}</div>
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
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (!open || isMobile) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenSafe(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenSafe(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpenSafe, isMobile]);

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
            { id: "offen" as const, label: "Offen" },
            { id: "erledigt" as const, label: "Erledigt" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
              filter === f.id ? "text-white" : "border"
            )}
            style={
              filter === f.id
                ? { background: PORTAL_VAR.primary }
                : {
                    borderColor: "var(--p2-line)",
                    color: "var(--p2-sub)",
                    background: "#fff",
                  }
            }
          >
            {f.label}
          </button>
        ))}
      </div>
    ) : null;

  const header = (
    <div
      className="flex items-center justify-between gap-3 px-4 py-[13px]"
      style={{ borderBottom: "1px solid var(--p2-line)" }}
    >
      <span className="text-[14.5px] font-bold" style={{ color: "var(--p2-ink)" }}>
        Benachrichtigungen
      </span>
      {unreadCount > 0 ? (
        <button
          type="button"
          disabled={marking}
          onClick={() => void handleMarkAll()}
          className="text-[12px] font-semibold disabled:opacity-50"
          style={{ color: "var(--org-primary, var(--p2-primary))" }}
        >
          Alle gelesen
        </button>
      ) : null}
    </div>
  );

  const footer = (
    <div
      className="px-4 py-[11px] text-center"
      style={{ borderTop: "1px solid var(--p2-line)" }}
    >
      {allHref ? (
        <Link
          href={allHref}
          onClick={() => setOpenSafe(false)}
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--org-primary, var(--p2-primary))" }}
        >
          Alle Vorgänge
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setOpenSafe(false)}
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--org-primary, var(--p2-primary))" }}
        >
          Schließen
        </button>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative z-20 shrink-0">
      <button
        type="button"
        className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border text-[17px] transition-colors"
        style={{
          borderColor: "var(--p2-line)",
          color: "var(--p2-sub)",
          background: open
            ? "var(--org-primary-soft, var(--p2-primary-soft))"
            : "var(--p2-panel)",
        }}
        aria-label={
          unreadCount > 0
            ? `Benachrichtigungen, ${unreadCount} ungelesen`
            : "Benachrichtigungen"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenSafe(!open)}
      >
        <MockIcon ctx="emphasis" n="bell" size={18} />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-[5px] -top-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white px-1 text-[11px] font-bold leading-none text-white"
            style={{ background: NOTIF_BADGE, boxSizing: "border-box" }}
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <PortalModalShell
          open
          title="Benachrichtigungen"
          onClose={() => setOpenSafe(false)}
          variant="edit"
          closeOnBackdrop
        >
          <div id={panelId} className="flex min-h-0 flex-col">
            {unreadCount > 0 ? (
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  disabled={marking}
                  onClick={() => void handleMarkAll()}
                  className="text-[12px] font-semibold disabled:opacity-50"
                  style={{ color: "var(--org-primary, var(--p2-primary))" }}
                >
                  Alle gelesen
                </button>
              </div>
            ) : null}
            {filterBar}
            <div className="min-h-0 max-h-[min(60vh,420px)] flex-1 overflow-y-auto">
              <NotifList
                items={filtered}
                loading={loading}
                onItemActivate={onItemActivate}
                onItem={(n) => void handleItem(n)}
              />
            </div>
            {footer}
          </div>
        </PortalModalShell>
      ) : null}
    </div>
  );
}
