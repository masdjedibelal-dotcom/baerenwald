"use client";

import { useCallback, useEffect, useState } from "react";

import { portalToastSuccess, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type CalEvent = {
  event_beginn: string;
  event_typ: string;
  titel: string;
  kunde_objekt_id?: string | null;
};

const TYP_LABEL: Record<string, string> = {
  wiedervorlage: "Wiedervorlage",
  pruefpflicht: "Prüfpflicht",
  dokument_erinnerung: "Dokument",
  abo_start: "Abo Start",
  abo_ende: "Abo Ende",
};

export function OrganisationObjektKalenderPanel({ objektId }: { objektId: string }) {
  const [monat, setMonat] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/kalender?objektId=${objektId}&monat=${encodeURIComponent(monat)}`
    );
    const json = (await res.json()) as { events?: CalEvent[] };
    setEvents(json.events ?? []);
  }, [objektId, monat]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createFeed() {
    try {
      const res = await fetch("/api/org/kalender", { method: "POST" });
      const json = (await res.json()) as { error?: string; webcalUrl?: string; icsUrl?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setIcsUrl(json.webcalUrl ?? json.icsUrl ?? null);
      portalToastSuccess("Kalender-Link erstellt — in Outlook abonnieren.");
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    }
  }

  function shiftMonth(delta: number) {
    const [y, m] = monat.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonat(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">Kalender</p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-pill-outline portal-btn-compact !px-2" onClick={() => shiftMonth(-1)}>
            ←
          </button>
          <span className="text-sm font-medium">{monat}</span>
          <button type="button" className="btn-pill-outline portal-btn-compact !px-2" onClick={() => shiftMonth(1)}>
            →
          </button>
        </div>
      </div>

      <button type="button" className="text-xs font-semibold text-accent" onClick={() => void createFeed()}>
        In Outlook abonnieren (ICS)
      </button>
      {icsUrl ? (
        <p className="text-xs text-text-tertiary break-all">{icsUrl}</p>
      ) : null}

      {events.length === 0 ? (
        <p className="text-sm text-text-secondary">Keine Termine in diesem Monat.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev, i) => (
            <li
              key={`${ev.event_typ}-${ev.titel}-${i}`}
              className="flex gap-3 rounded-lg border border-border-light px-3 py-2 text-sm"
            >
              <span className="shrink-0 text-text-tertiary w-20">
                {new Date(ev.event_beginn).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <span className={cn("tag shrink-0", "bg-accent-light text-accent")}>
                {TYP_LABEL[ev.event_typ] ?? ev.event_typ}
              </span>
              <span>{ev.titel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
