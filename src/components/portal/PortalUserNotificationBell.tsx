"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalNotificationBell } from "@/components/portal/PortalNotificationBell";
import { portalNotificationRowToItem } from "@/lib/portal2/notif-adapters";
import {
  PORTAL_NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/portal2/notif-refresh";
import type { PortalNotifItem, PortalNotifRole } from "@/lib/portal2/notif-types";
import { vorgangIdFromPortalHref } from "@/lib/portal2/portal-detail-deep-link";

type ApiRow = {
  id: string;
  typ: string;
  titel: string;
  body: string;
  vorgang_ref?: string | null;
  link?: string | null;
  gelesen: boolean;
  created_at: string;
  icon_bg?: string | null;
  icon_fg?: string | null;
  icon_glyph?: string | null;
};

/**
 * Kunde / Eigentümer / Mieter — liest `portal_notifications`.
 * Solange Migration nicht applied: leere Liste (API 200 + items []).
 */
export function PortalUserNotificationBell({
  role = "kunde",
  allHref = "/portal?section=vorgaenge",
  onOpenVorgang,
}: {
  role?: PortalNotifRole;
  allHref?: string;
  /** Direkter Absprung in den Vorgang (umgeht ignoreUrlDetailRef). */
  onOpenVorgang?: (vorgangId: string, href: string) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/notifications");
      if (!res.ok) {
        setRows([]);
        setUnread(0);
        return;
      }
      const json = (await res.json()) as {
        notifications?: ApiRow[];
        unread?: number;
      };
      setRows(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onChanged = () => void load();
    window.addEventListener(PORTAL_NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () =>
      window.removeEventListener(PORTAL_NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [load]);

  const items = useMemo(
    () => rows.map((n) => portalNotificationRowToItem(n, role)),
    [rows, role]
  );

  async function markAllRead() {
    await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setRows((prev) => prev.map((n) => ({ ...n, gelesen: true })));
  }

  async function onItemActivate(n: PortalNotifItem) {
    if (n.unread) {
      await fetch("/api/portal/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setRows((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, gelesen: true } : x))
      );
      setUnread((c) => Math.max(0, c - 1));
    }

    const href = n.link?.trim() || null;
    if (!href) return;

    const vorgangId =
      n.vorgangRef?.trim() || vorgangIdFromPortalHref(href);
    if (vorgangId && onOpenVorgang) {
      onOpenVorgang(vorgangId, href);
      return;
    }
    router.push(href);
  }

  return (
    <PortalNotificationBell
      items={items}
      unreadCount={unread}
      loading={loading}
      allHref={allHref}
      onMarkAllRead={markAllRead}
      onItemActivate={onItemActivate}
      onRefresh={load}
      showReadFilter
    />
  );
}
