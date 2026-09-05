"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalNotificationBell } from "@/components/portal/PortalNotificationBell";
import { hvNotificationToPortalItem } from "@/lib/portal2/notif-adapters";
import {
  PORTAL_NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/portal2/notif-refresh";
import type { PortalNotifItem } from "@/lib/portal2/notif-types";
import { vorgangIdFromPortalHref } from "@/lib/portal2/portal-detail-deep-link";

type Notification = {
  id: string;
  typ: string;
  titel: string;
  body?: string | null;
  link?: string | null;
  gelesen_am?: string | null;
  created_at: string;
};

/** HV-Glocke — Daten aus `hv_notifications`, UI = Mock bell/notifPanel. */
export function HvNotificationBell({
  onOpenVorgang,
}: {
  onOpenVorgang?: (vorgangId: string, href: string) => void;
} = {}) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/hv-notifications");
      const json = (await res.json()) as {
        notifications?: Notification[];
        unread?: number;
      };
      setItems(json.notifications ?? []);
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

  const portalItems = useMemo(
    () => items.map((n) => hvNotificationToPortalItem(n, "kunde")),
    [items]
  );

  async function markAllRead() {
    await fetch("/api/org/hv-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, gelesen_am: new Date().toISOString() }))
    );
  }

  async function onItemActivate(n: PortalNotifItem) {
    if (n.unread) {
      await fetch("/api/org/hv-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, gelesen_am: new Date().toISOString() } : x
        )
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
      items={portalItems}
      unreadCount={unread}
      loading={loading}
      allHref="/portal?section=vorgaenge"
      onMarkAllRead={markAllRead}
      onItemActivate={onItemActivate}
      onRefresh={load}
      showReadFilter
    />
  );
}
