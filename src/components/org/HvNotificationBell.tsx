"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  typ: string;
  titel: string;
  body?: string | null;
  link?: string | null;
  gelesen_am?: string | null;
  created_at: string;
};

/** S13: HV-Benachrichtigungs-Glocke */
export function HvNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
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
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAllRead() {
    await fetch("/api/org/hv-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, gelesen_am: new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-full p-2 hover:bg-muted"
        aria-label="Benachrichtigungen"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell className="h-5 w-5 text-text-secondary" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border-default bg-surface-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border-light px-3 py-2">
            <p className="text-sm font-semibold">Benachrichtigungen</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-accent"
                onClick={() => void markAllRead()}
              >
                Alle gelesen
              </button>
            ) : null}
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {loading ? (
              <li className="p-4 text-sm text-text-secondary">Lädt…</li>
            ) : items.length === 0 ? (
              <li className="p-4 text-sm text-text-secondary">Keine Benachrichtigungen.</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-border-light px-3 py-2.5 text-sm last:border-0",
                    !n.gelesen_am && "bg-accent-light/30"
                  )}
                >
                  <p className="font-medium text-text-primary">{n.titel}</p>
                  {n.body ? (
                    <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
