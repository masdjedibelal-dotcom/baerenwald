"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Einheit = {
  id: string;
  bezeichnung: string;
  wohnflaeche_m2: number | null;
  aktiv: boolean;
};

type BewohnerRow = {
  id: string;
  name: string;
  objekt_einheit_id: string;
};

/**
 * S6 / E2 — Einheiten-Pflege.
 * `variant="detail"` ≈ Mock `objTabBody` Einheiten (Badge vermietet/leer, „＋ Einheit“).
 */
export function OrganisationObjektEinheitenPanel({
  objektId,
  onEinheitenChange,
  embedded = false,
  variant = "default",
  titleCount,
}: {
  objektId: string;
  onEinheitenChange?: () => void;
  embedded?: boolean;
  variant?: "default" | "detail";
  /** Mock-Header „n Einheiten“ (Detail-Tab). */
  titleCount?: number;
}) {
  const [items, setItems] = useState<Einheit[]>([]);
  const [bewohner, setBewohner] = useState<BewohnerRow[]>([]);
  const [bezeichnung, setBezeichnung] = useState("");
  const [m2, setM2] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(variant !== "detail");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/objekte/einheiten?objektId=${encodeURIComponent(objektId)}`
    );
    if (!res.ok) return;
    const json = (await res.json()) as { einheiten: Einheit[] };
    setItems(json.einheiten ?? []);
  }, [objektId]);

  const loadBewohner = useCallback(async () => {
    if (variant !== "detail") return;
    const res = await fetch(
      `/api/org/einheit-bewohner?objektId=${encodeURIComponent(objektId)}`
    );
    if (!res.ok) return;
    const json = (await res.json()) as { bewohner?: BewohnerRow[] };
    setBewohner(json.bewohner ?? []);
  }, [objektId, variant]);

  useEffect(() => {
    void load();
    void loadBewohner();
  }, [load, loadBewohner]);

  const occupied = useMemo(() => {
    const set = new Set<string>();
    for (const b of bewohner) {
      if (b.objekt_einheit_id) set.add(b.objekt_einheit_id);
    }
    return set;
  }, [bewohner]);

  const bewohnerByEinheit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of bewohner) {
      const list = map.get(b.objekt_einheit_id) ?? [];
      list.push(b.name);
      map.set(b.objekt_einheit_id, list);
    }
    return map;
  }, [bewohner]);

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
      setShowForm(variant !== "detail");
      orgPortalToast.objektAktualisiert();
      await load();
      onEinheitenChange?.();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(
      `/api/org/objekte/einheiten?id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await load();
      onEinheitenChange?.();
    }
  }

  if (variant === "detail") {
    const n = titleCount ?? items.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary">
            {n} {n === 1 ? "Einheit" : "Einheiten"}
          </p>
          <button
            type="button"
            className="rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white"
            onClick={() => setShowForm((v) => !v)}
          >
            ＋ Einheit
          </button>
        </div>

        {showForm ? (
          <form
            onSubmit={add}
            className="grid grid-cols-2 gap-2 rounded-xl border border-border-default bg-white p-3"
          >
            <input
              className="portal-input rounded-xl border border-border-default px-3 py-2 text-sm"
              placeholder="Bezeichnung (z. B. WE 1)"
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
            <button
              type="submit"
              className="btn-pill-outline col-span-2 !text-xs"
              disabled={busy}
            >
              Speichern
            </button>
          </form>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border-default bg-white">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-text-secondary">
              Noch keine Einheiten.
            </p>
          ) : (
            <ul>
              {items.map((u, i) => {
                const names = bewohnerByEinheit.get(u.id) ?? [];
                const vermietet = occupied.has(u.id);
                const badge = vermietet ? "vermietet" : "leer";
                const sub =
                  names.length > 0
                    ? names.join(", ")
                    : vermietet
                      ? "Bewohner"
                      : "leer";
                return (
                  <li
                    key={u.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5",
                      i < items.length - 1 && "border-b border-border-default"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
                        {u.bezeichnung}
                        {u.wohnflaeche_m2 != null
                          ? ` · ${u.wohnflaeche_m2} m²`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-text-secondary">
                        {sub}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        badge === "leer"
                          ? "bg-[#FBF1D6] text-[#8A5A06]"
                          : "bg-accent-light text-accent"
                      )}
                    >
                      {badge}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-red-600 hover:underline"
                      onClick={() => void remove(u.id)}
                    >
                      Entfernen
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "mt-4 space-y-3 border-t border-border-default pt-4"
      }
    >
      <p className="portal-text-label text-text-primary">Einheiten &amp; m²</p>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="portal-text-meta text-text-tertiary">
            Noch keine Einheiten.
          </li>
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
        <button
          type="submit"
          className="btn-pill-outline col-span-2 !text-xs"
          disabled={busy}
        >
          ＋ Einheit
        </button>
      </form>
    </div>
  );
}
