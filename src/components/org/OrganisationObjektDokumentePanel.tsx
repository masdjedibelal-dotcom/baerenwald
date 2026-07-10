"use client";

import { useCallback, useEffect, useState } from "react";

import { portalToastError } from "@/lib/shared/portal-toast";

type Dok = {
  id: string;
  kategorie: string;
  titel: string;
  ablauf_datum?: string | null;
  storage_url?: string | null;
};

const KATS = [
  { id: "versicherung", label: "Versicherung" },
  { id: "vertrag", label: "Vertrag" },
  { id: "protokoll", label: "Protokoll" },
  { id: "grundbuch", label: "Grundbuch" },
  { id: "sonstiges", label: "Sonstiges" },
];

export function OrganisationObjektDokumentePanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Dok[]>([]);
  const [titel, setTitel] = useState("");
  const [kategorie, setKategorie] = useState("sonstiges");
  const [ablauf, setAblauf] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/objekte/dokumente?objektId=${objektId}`);
    const json = (await res.json()) as { dokumente?: Dok[] };
    setItems(json.dokumente ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("objektId", objektId);
      fd.set("titel", titel);
      fd.set("kategorie", kategorie);
      if (ablauf) fd.set("ablaufDatum", ablauf);
      if (file) fd.set("file", file);
      const res = await fetch("/api/org/objekte/dokumente", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setTitel("");
      setAblauf("");
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
      <p className="text-sm font-semibold text-text-primary">Objekt-Dokumente</p>
      <p className="text-xs text-text-tertiary">Erinnerung 60 und 30 Tage vor Ablauf im Kalender.</p>
      <ul className="space-y-2 text-sm">
        {items.map((d) => (
          <li key={d.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span>
              <span className="tag bg-muted text-text-secondary mr-1">{d.kategorie}</span>
              {d.titel}
            </span>
            <span className="text-text-secondary">
              {d.ablauf_datum ? `Ablauf ${d.ablauf_datum}` : "—"}
              {d.storage_url ? (
                <a href={d.storage_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-accent">
                  Öffnen
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={upload} className="space-y-2 border-t border-border-light pt-4">
        <input className="input-field w-full" placeholder="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
        <select className="input-field w-full" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
          {KATS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <input type="date" className="input-field w-full" value={ablauf} onChange={(e) => setAblauf(e.target.value)} />
        <input type="file" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy}>
          Dokument speichern
        </button>
      </form>
    </div>
  );
}
