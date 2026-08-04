"use client";

import { useCallback, useEffect, useState } from "react";

import { portalToastError } from "@/lib/shared/portal-toast";

type Item = {
  id: string;
  titel: string;
  datum: string;
  kategorie: string;
  betrag?: number | null;
  dokument_url?: string | null;
  quelle: string;
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export function OrganisationObjektFremdVorgaengePanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [kategorie] = useState("sonstiges");
  const [betrag, setBetrag] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/objekte/fremd-vorgaenge?objektId=${objektId}`);
    const json = (await res.json()) as { items?: Item[] };
    setItems(json.items ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("objektId", objektId);
      fd.set("titel", titel);
      fd.set("datum", datum);
      fd.set("kategorie", kategorie);
      if (betrag) fd.set("betrag", betrag);
      if (file) fd.set("file", file);
      const res = await fetch("/api/org/objekte/fremd-vorgaenge", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setTitel("");
      setBetrag("");
      setFile(null);
      await load();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-primary">Fremd-Vorgänge</p>
      <p className="text-xs text-text-tertiary">
        Externe Arbeiten ohne Bärenwald-Workflow — zählen nicht in KPIs.
      </p>
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.id} className="rounded-lg border border-border-light p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag bg-neutral-200 text-neutral-700">extern</span>
              <span className="font-medium">{f.titel}</span>
            </div>
            <p className="mt-1 text-text-secondary">
              {f.datum} · {f.kategorie}
              {f.betrag != null ? ` · ${fmtEur(f.betrag)}` : ""}
            </p>
            {f.dokument_url ? (
              <a href={f.dokument_url} className="text-xs text-accent" target="_blank" rel="noopener noreferrer">
                Dokument
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2 border-t border-border-light pt-4">
        <input className="input-field w-full" placeholder="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input-field" value={datum} onChange={(e) => setDatum(e.target.value)} />
          <input className="input-field" placeholder="Betrag €" value={betrag} onChange={(e) => setBetrag(e.target.value)} />
        </div>
        <input type="file" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy}>
          Eintrag dokumentieren
        </button>
      </form>
    </div>
  );
}
