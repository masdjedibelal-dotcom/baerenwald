"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchPartnerNotifications,
  markAllPartnerNotificationsRead,
  markPartnerNotificationRead,
} from "@/app/actions/partner-notifications";
import { PortalNotificationBell } from "@/components/portal/PortalNotificationBell";
import { partnerNotificationToPortalItem } from "@/lib/portal2/notif-adapters";
import type { PortalNotifItem } from "@/lib/portal2/notif-types";
import {
  dedupePartnerNotificationsByVorgang,
  partnerNotificationVorgangKey,
  type PartnerNotificationRow,
} from "@/lib/partner/partner-notifications";
import {
  partnerVorgangIdFromNotificationLink,
  resolvePartnerNotificationLink,
} from "@/lib/partner/partner-site-url";

const POLL_MS = 30_000;

/** Partner-Glocke — Daten aus `notifications`, UI = Mock bell/notifPanel. */
export function PartnerNotificationBell({
  onOpenVorgang,
}: {
  onOpenVorgang?: (vorgangId: string, href: string) => void;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState<PartnerNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPartnerNotifications();
      if (res.ok) {
        setRaw(res.items);
        setUnread(res.unread);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const items = useMemo(
    () => raw.map(partnerNotificationToPortalItem),
    [raw]
  );

  async function onItemActivate(n: PortalNotifItem) {
    const row = raw.find((x) => x.id === n.id);
    if (row && !row.gelesen) {
      await markPartnerNotificationRead(row.id);
      const vorgangKey = partnerNotificationVorgangKey(row.link);
      setRaw((prev) =>
        dedupePartnerNotificationsByVorgang(
          prev.map((x) => {
            if (x.gelesen) return x;
            if (vorgangKey) {
              return partnerNotificationVorgangKey(x.link) === vorgangKey
                ? { ...x, gelesen: true }
                : x;
            }
            return x.id === row.id ? { ...x, gelesen: true } : x;
          })
        )
      );
      setUnread((c) => Math.max(0, c - 1));
    }

    const href =
      n.link || (row ? resolvePartnerNotificationLink(row.link) : null);
    if (!href) return;

    const vorgangId = partnerVorgangIdFromNotificationLink(row?.link ?? null);
    if (vorgangId && onOpenVorgang) {
      onOpenVorgang(vorgangId, href);
      return;
    }
    router.push(href);
  }

  async function onMarkAll() {
    await markAllPartnerNotificationsRead();
    setRaw((prev) => prev.map((x) => ({ ...x, gelesen: true })));
    setUnread(0);
  }

  return (
    <PortalNotificationBell
      items={items}
      unreadCount={unread}
      loading={loading}
      allHref="/partner?section=auftraege"
      onMarkAllRead={onMarkAll}
      onItemActivate={onItemActivate}
      onRefresh={load}
    />
  );
}
