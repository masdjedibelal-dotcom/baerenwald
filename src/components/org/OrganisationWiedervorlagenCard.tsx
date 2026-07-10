"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  text: string;
  wiedervorlageAm: string;
  objektId?: string | null;
  leadId?: string | null;
  objektTitel: string;
};

export function OrganisationWiedervorlagenCard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);

  async function load() {
    const res = await fetch("/api/org/wiedervorlagen");
    const json = (await res.json()) as { items?: Item[]; count?: number };
    setItems(json.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function erledigen(id: string) {
    await fetch("/api/org/wiedervorlagen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  if (items.length === 0) return null;

  return (
    <article className="card-bordered space-y-3 p-4">
      <p className="portal-text-body font-semibold text-text-primary">
        Ihre Wiedervorlagen ({items.length})
      </p>
      <ul className="space-y-2">
        {items.map((w) => (
          <li
            key={w.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-amber-50/80 px-3 py-2 text-sm"
          >
            <button
              type="button"
              className="text-left"
              onClick={() => {
                if (w.leadId) {
                  router.push(`/portal?section=vorgaenge&filter=aktiv&id=${w.leadId}`);
                } else if (w.objektId) {
                  router.push("/portal?section=objekte");
                }
              }}
            >
              <span className="font-medium">{w.objektTitel}</span>
              <span className="block text-text-secondary line-clamp-2">{w.text}</span>
              <span className="text-xs text-amber-900">Fällig {w.wiedervorlageAm}</span>
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-accent shrink-0"
              onClick={() => void erledigen(w.id)}
            >
              Erledigt
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}
