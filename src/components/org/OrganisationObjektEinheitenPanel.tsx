"use client";

import { useCallback, useEffect, useState } from "react";

import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Einheit = {
  id: string;
  bezeichnung: string;
  wohnflaeche_m2: number | null;
  aktiv: boolean;
};

/** S6 — Einheiten-Pflege pro Objekt */
export function OrganisationObjektEinheitenPanel({
  objektId,
  onEinheitenChange,
  embedded = false,
}: {
  objektId: string;
  onEinheitenChange?: () => void;
  embedded?: boolean;
}) {
  const [items, setItems] = useState<Einheit[]>([]);
  const [bezeichnung, setBezeichnung] = useState("");
  const [m2, setM2] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/objekte/einheiten?objektId=${encodeURIComponent(objektId)}`
    );
    if (!res.ok) return;
    const json = (await res.json()) as { einheiten: Einheit[] };
    setItems(json.einheiten ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/objekte/einheiten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          bezeichnung,
          wohnflaeche_m2: m2 ? Number(m2) : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(json.error ?? "Fehler");
        return;
      }
      setBezeichnung("");
      setM2("");
      orgPortalToast.objektAktualisiert();
      await load();
      onEinheitenChange?.();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/org/objekte/einheiten?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await load();
      onEinheitenChange?.();
    }
  }

  return (
    <div className={embedded ? "space-y-3" : "mt-4 space-y-3 border-t border-border-default pt-4"}>
      <p className="portal-text-label text-text-primary">Einheiten &amp; m²</p>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="portal-text-meta text-text-tertiary">Noch keine Einheiten.</li>
        ) : (
          items.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
            >
              <span>
                {u.bezeichnung}
                {u.wohnflaeche_m2 != null ? ` · ${u.wohnflaeche_m2} m²` : ""}
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => void remove(u.id)}
              >
                Entfernen
              </button>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={add} className="grid grid-cols-2 gap-2">
        <input
          className="portal-input rounded-xl border border-border-default px-3 py-2 text-sm"
          placeholder="Bezeichnung (z. B. WH 12)"
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          required
        />
        <input
          type="number"
          min={0}
          step={0.1}
          className="portal-input rounded-xl border border-border-default px-3 py-2 text-sm"
          placeholder="m² (optional)"
          value={m2}
          onChange={(e) => setM2(e.target.value)}
        />
        <button type="submit" className="btn-pill-outline col-span-2 !text-xs" disabled={busy}>
          Einheit hinzufügen
        </button>
      </form>
    </div>
  );
}
