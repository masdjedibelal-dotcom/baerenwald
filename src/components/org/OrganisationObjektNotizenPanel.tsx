"use client";

import { useCallback, useEffect, useState } from "react";

import { portalToastError } from "@/lib/shared/portal-toast";

type Notiz = {
  id: string;
  text: string;
  wiedervorlage_am?: string | null;
  erledigt_am?: string | null;
  created_at: string;
};

export function OrganisationObjektNotizenPanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Notiz[]>([]);
  const [text, setText] = useState("");
  const [wiedervorlage, setWiedervorlage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/akten-notizen?objektId=${objektId}`);
    const json = (await res.json()) as { notizen?: Notiz[] };
    setItems(json.notizen ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/akten-notizen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          text,
          wiedervorlageAm: wiedervorlage || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setText("");
      setWiedervorlage("");
      await load();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function erledigen(id: string) {
    await fetch("/api/org/akten-notizen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, erledigt: true }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-primary">Notizen &amp; Wiedervorlagen</p>
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className="rounded-lg border border-border-light p-3 text-sm">
            <p>{n.text}</p>
            {n.wiedervorlage_am && !n.erledigt_am ? (
              <p className="mt-1 text-xs text-amber-800">
                Wiedervorlage: {n.wiedervorlage_am}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => void erledigen(n.id)}
                >
                  Erledigt
                </button>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2 border-t border-border-light pt-4">
        <textarea
          className="input-field w-full min-h-[72px]"
          placeholder="Notiz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <label className="block text-xs text-text-secondary">
          Wiedervorlage (optional)
          <input
            type="date"
            className="input-field mt-1 w-full"
            value={wiedervorlage}
            onChange={(e) => setWiedervorlage(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy}>
          Speichern
        </button>
      </form>
    </div>
  );
}

/** Notizen am Vorgang (Lead) */
export function OrganisationVorgangNotizenPanel({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Notiz[]>([]);
  const [text, setText] = useState("");
  const [wiedervorlage, setWiedervorlage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/akten-notizen?leadId=${leadId}`);
    const json = (await res.json()) as { notizen?: Notiz[] };
    setItems(json.notizen ?? []);
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/org/akten-notizen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, text, wiedervorlageAm: wiedervorlage || undefined }),
    });
    if (res.ok) {
      setText("");
      setWiedervorlage("");
      await load();
    }
  }

  if (items.length === 0 && !text) {
    return (
      <form onSubmit={add} className="space-y-2 rounded-lg border border-dashed border-border-light p-3">
        <p className="text-xs font-medium text-text-secondary">Vorgangs-Notiz</p>
        <textarea
          className="input-field w-full min-h-[56px] text-sm"
          placeholder="Interne Notiz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="date"
          className="input-field w-full text-sm"
          value={wiedervorlage}
          onChange={(e) => setWiedervorlage(e.target.value)}
        />
        <button type="submit" className="text-xs font-semibold text-accent" disabled={!text.trim()}>
          Notiz speichern
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/30 p-3">
      <p className="text-xs font-medium text-text-secondary">Vorgangs-Notizen</p>
      {items.map((n) => (
        <p key={n.id} className="text-sm">
          {n.text}
          {n.wiedervorlage_am ? (
            <span className="text-xs text-amber-800"> · WV {n.wiedervorlage_am}</span>
          ) : null}
        </p>
      ))}
      <form onSubmit={add} className="flex gap-2 pt-1">
        <input
          className="input-field flex-1 text-sm"
          placeholder="Neue Notiz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-pill-outline portal-btn-compact !text-xs">
          +
        </button>
      </form>
    </div>
  );
}
