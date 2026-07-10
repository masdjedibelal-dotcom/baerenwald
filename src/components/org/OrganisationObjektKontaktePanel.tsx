"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";

import { portalToastError } from "@/lib/shared/portal-toast";

type Kontakt = {
  id: string;
  rolle: string;
  name: string;
  telefon?: string | null;
  email?: string | null;
  notiz?: string | null;
};

const ROLLEN = [
  { id: "hausmeister", label: "Hausmeister" },
  { id: "beirat", label: "Beirat" },
  { id: "dienstleister", label: "Dienstleister" },
  { id: "notfall", label: "Notfall" },
  { id: "sonstiges", label: "Sonstiges" },
];

export function OrganisationObjektKontaktePanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Kontakt[]>([]);
  const [rolle, setRolle] = useState("hausmeister");
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/objekte/kontakte?objektId=${objektId}`);
    const json = (await res.json()) as { kontakte?: Kontakt[] };
    setItems(json.kontakte ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/objekte/kontakte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objektId, rolle, name, telefon, email, notiz }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setName("");
      setTelefon("");
      setEmail("");
      setNotiz("");
      await load();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-primary">Kontakte am Objekt</p>
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">Noch keine Kontakte.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((k) => (
            <li key={k.id} className="rounded-lg border border-border-light p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="tag bg-muted text-text-secondary mr-2">{k.rolle}</span>
                  <span className="font-medium">{k.name}</span>
                  {k.notiz ? (
                    <p className="mt-1 text-xs text-text-tertiary">{k.notiz}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {k.telefon ? (
                    <a href={`tel:${k.telefon}`} className="text-accent" aria-label="Anrufen">
                      <Phone className="h-4 w-4" />
                    </a>
                  ) : null}
                  {k.email ? (
                    <a href={`mailto:${k.email}`} className="text-accent" aria-label="E-Mail">
                      <Mail className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="space-y-2 border-t border-border-light pt-4">
        <select className="input-field w-full" value={rolle} onChange={(e) => setRolle(e.target.value)}>
          {ROLLEN.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <input className="input-field w-full" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input className="input-field" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
          <input className="input-field" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <input className="input-field w-full" placeholder="Notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy}>
          Kontakt anlegen
        </button>
      </form>
    </div>
  );
}
