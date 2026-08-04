"use client";

import { useEffect, useState } from "react";

type Pruefpflicht = {
  id: string;
  typ: string;
  intervall_monate?: number | null;
  letzte_pruefung?: string | null;
  naechste_faellig?: string | null;
};

/** Prüfpflichten-Kalender je Objekt (4.2) */
export function OrganisationObjektPruefpflichtenPanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Pruefpflicht[]>([]);
  const [typ, setTyp] = useState("");
  const [naechste, setNaechste] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/org/objekte/pruefpflichten?objektId=${objektId}`);
    const json = (await res.json()) as { items?: Pruefpflicht[] };
    setItems(json.items ?? []);
  }

  useEffect(() => {
    void load();
  }, [objektId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!typ.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/objekte/pruefpflichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          typ: typ.trim(),
          naechsteFaellig: naechste || undefined,
        }),
      });
      if (res.ok) {
        setTyp("");
        setNaechste("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border-default p-4">
      <p className="text-sm font-semibold text-text-primary">Prüfpflichten</p>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Noch keine Einträge.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
            >
              <span className="font-medium">{p.typ}</span>
              <span className="text-text-secondary">
                {p.naechste_faellig
                  ? `Fällig ${p.naechste_faellig}`
                  : "Termin offen"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap gap-2 pt-2 border-t border-border-light">
        <input
          className="input-field flex-1 min-w-[140px]"
          placeholder="z. B. Feuerlöscher"
          value={typ}
          onChange={(e) => setTyp(e.target.value)}
        />
        <input
          type="date"
          className="input-field"
          value={naechste}
          onChange={(e) => setNaechste(e.target.value)}
        />
        <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy}>
          Hinzufügen
        </button>
      </form>
    </div>
  );
}
