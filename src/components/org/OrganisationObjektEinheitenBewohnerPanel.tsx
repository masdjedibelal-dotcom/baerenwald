"use client";

import { useCallback, useEffect, useState } from "react";

import { OrganisationObjektEinheitenPanel } from "@/components/org/OrganisationObjektEinheitenPanel";
import { portalToastError } from "@/lib/shared/portal-toast";

type Bewohner = {
  id: string;
  objekt_einheit_id: string;
  name: string;
  telefon?: string | null;
  email?: string | null;
  objekt_einheiten?: { bezeichnung?: string } | null;
};

export function OrganisationObjektEinheitenBewohnerPanel({
  objektId,
  detailLayout = false,
  titleCount,
}: {
  objektId: string;
  /** E2 Detail-Tab: Mock-Einheitenliste + Bewohner darunter. */
  detailLayout?: boolean;
  titleCount?: number;
}) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [einheitId, setEinheitId] = useState("");
  const [einheiten, setEinheiten] = useState<Array<{ id: string; bezeichnung: string }>>([]);
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const loadBewohner = useCallback(async () => {
    const res = await fetch(`/api/org/einheit-bewohner?objektId=${objektId}`);
    const json = (await res.json()) as { bewohner?: Bewohner[] };
    setBewohner(json.bewohner ?? []);
  }, [objektId]);

  const loadEinheiten = useCallback(async () => {
    const res = await fetch(`/api/org/objekte/einheiten?objektId=${objektId}`);
    const json = (await res.json()) as { einheiten?: Array<{ id: string; bezeichnung: string }> };
    const list = json.einheiten ?? [];
    setEinheiten(list);
    setEinheitId((prev) => prev || list[0]?.id || "");
  }, [objektId]);

  useEffect(() => {
    void loadBewohner();
    void loadEinheiten();
  }, [loadBewohner, loadEinheiten]);

  async function addBewohner(e: React.FormEvent) {
    e.preventDefault();
    if (!einheitId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ einheitId, name, telefon, email }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setName("");
      setTelefon("");
      setEmail("");
      await loadBewohner();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <OrganisationObjektEinheitenPanel
        objektId={objektId}
        embedded
        variant={detailLayout ? "detail" : "default"}
        titleCount={titleCount}
        onEinheitenChange={loadEinheiten}
      />

      <div
        className={
          detailLayout
            ? "space-y-3 rounded-xl border border-border-default bg-white p-4"
            : "space-y-3 border-t border-border-light pt-4"
        }
      >
        <p className="text-sm font-semibold text-text-primary">
          Bewohner (nur intern)
        </p>
        <p className="text-xs text-text-tertiary">
          Stammdaten für HV und CRM — nicht im öffentlichen Meldeformular.
        </p>
        {bewohner.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {bewohner.map((b) => (
              <li key={b.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium">{b.name}</span>
                <span className="text-text-secondary">
                  {" "}
                  · {b.objekt_einheiten?.bezeichnung ?? "Einheit"}
                </span>
                {b.telefon ? <span className="block text-xs text-text-tertiary">{b.telefon}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">Noch keine Bewohner erfasst.</p>
        )}
        <form onSubmit={addBewohner} className="space-y-2">
          <select
            className="input-field w-full"
            value={einheitId}
            onChange={(e) => setEinheitId(e.target.value)}
            required
          >
            {einheiten.map((e) => (
              <option key={e.id} value={e.id}>
                {e.bezeichnung}
              </option>
            ))}
          </select>
          <input className="input-field w-full" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
            <input className="input-field" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-pill-outline portal-btn-compact" disabled={busy || !einheiten.length}>
            Bewohner anlegen
          </button>
        </form>
      </div>
    </div>
  );
}
