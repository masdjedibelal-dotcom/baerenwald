"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchPartnerNotifications,
  markAllPartnerNotificationsRead,
  markPartnerNotificationRead,
} from "@/app/actions/partner-notifications";
import {
  dedupePartnerNotificationsByVorgang,
  partnerNotificationVorgangKey,
  type PartnerNotificationRow,
} from "@/lib/partner/partner-notifications";
import {
  partnerVorgangIdFromNotificationLink,
  resolvePartnerNotificationLink,
} from "@/lib/partner/partner-site-url";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

function typLabel(typ: PartnerNotificationRow["typ"]): string {
  if (typ === "neu") return "Neu";
  if (typ === "geaendert") return "Geändert";
  if (typ === "entfernt") return "Entfernt";
  if (typ === "bautagebuch") return "Tagebuch";
  return "Erinnerung";
}

export function PartnerNotificationBell({
  onOpenVorgang,
}: {
  /** Direkt Vorgang öffnen (PartnerClient setzt Detail + URL). */
  onOpenVorgang?: (vorgangId: string, href: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PartnerNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetchPartnerNotifications();
    if (res.ok) {
      setItems(res.items);
      setUnread(res.unread);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onItemClick(n: PartnerNotificationRow) {
    if (!n.gelesen) {
      await markPartnerNotificationRead(n.id);
      const vorgangKey = partnerNotificationVorgangKey(n.link);
      setItems((prev) =>
        dedupePartnerNotificationsByVorgang(
          prev.map((x) => {
            if (x.gelesen) return x;
            if (vorgangKey) {
              return partnerNotificationVorgangKey(x.link) === vorgangKey
                ? { ...x, gelesen: true }
                : x;
            }
            return x.id === n.id ? { ...x, gelesen: true } : x;
          })
        )
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    const href = resolvePartnerNotificationLink(n.link);
    if (!href) return;

    const vorgangId = partnerVorgangIdFromNotificationLink(n.link);
    if (vorgangId && onOpenVorgang) {
      onOpenVorgang(vorgangId, href);
      return;
    }

    router.push(href);
  }

  async function onMarkAll() {
    await markAllPartnerNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, gelesen: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-surface-card text-text-secondary hover:bg-muted"
        aria-label="Benachrichtigungen"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-3 right-3 top-[4.25rem] z-[100] overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(22rem,calc(100vw-2rem))]">
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">Benachrichtigungen</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="text-xs font-medium text-accent hover:underline"
              >
                Alle gelesen
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-text-tertiary">
                Keine Benachrichtigungen
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void onItemClick(n)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/50",
                      !n.gelesen && "bg-accent-light/20"
                    )}
                  >
                    {!n.gelesen ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm",
                          n.gelesen ? "text-text-tertiary" : "font-semibold text-text-primary"
                        )}
                      >
                        {typLabel(n.typ)} · {n.projekt_name}
                      </span>
                      {n.leistung_name ? (
                        <span className="block truncate text-xs text-text-secondary">
                          {n.leistung_name}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
