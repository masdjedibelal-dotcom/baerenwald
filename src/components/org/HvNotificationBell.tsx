"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalNotificationBell } from "@/components/portal/PortalNotificationBell";
import { hvNotificationToPortalItem } from "@/lib/portal2/notif-adapters";

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
export function HvNotificationBell() {
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
  }, [load]);

  const portalItems = useMemo(
    () => items.map((n) => hvNotificationToPortalItem(n, "kunde")),
    [items]
  );

  async function markAllRead() {
    await fetch("/api/org/hv-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, gelesen_am: new Date().toISOString() }))
    );
  }

  return (
    <PortalNotificationBell
      items={portalItems}
      unreadCount={unread}
      loading={loading}
      allHref="/portal?section=vorgaenge"
      onMarkAllRead={markAllRead}
      onRefresh={load}
    />
  );
}
