"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalNotificationBell } from "@/components/portal/PortalNotificationBell";
import { portalNotificationRowToItem } from "@/lib/portal2/notif-adapters";
import type { PortalNotifRole } from "@/lib/portal2/notif-types";

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
}: {
  role?: PortalNotifRole;
  allHref?: string;
}) {
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

  return (
    <PortalNotificationBell
      items={items}
      unreadCount={unread}
      loading={loading}
      allHref={allHref}
      onMarkAllRead={markAllRead}
      onRefresh={load}
    />
  );
}
