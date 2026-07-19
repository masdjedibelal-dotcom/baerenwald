"use client";

import { useEffect, useState } from "react";

import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Abo = {
  id: string;
  produktSlug: string;
  status: string;
  endAm?: string | null;
  kuendigungEingereichtAm?: string | null;
  objektTitel: string;
};

/** Aktive Abos mit Kündigungs-UI */
export function OrganisationAktiveAbosPanel() {
  const [abos, setAbos] = useState<Abo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/org/abos");
    const json = (await res.json()) as { abos?: Abo[] };
    setAbos(json.abos ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function kuendigen(aboId: string) {
    if (!confirm("Abo wirklich kündigen?")) return;
    setBusy(aboId);
    try {
      const res = await fetch("/api/org/abos/kuendigen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboId }),
      });
      const json = (await res.json()) as { error?: string; endAm?: string };
      if (!res.ok) throw new Error(json.error ?? "Kündigung fehlgeschlagen");
      portalToastSuccess(`Gekündigt — endet am ${json.endAm ?? "Monatsende"}.`);
      await load();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  if (abos.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <p className="portal-text-section text-text-primary">Aktive Abos</p>
        <p className="portal-text-body text-text-secondary">
          Laufende Service-Verträge je Objekt
        </p>
      </div>
      <ul className="space-y-2">
        {abos.map((a) => (
          <li key={a.id} className="portal-surface flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-text-primary">{a.produktSlug}</p>
              <p className="text-sm text-text-secondary">{a.objektTitel}</p>
              {a.status === "gekuendigt" && a.endAm ? (
                <p className="text-xs text-amber-800 mt-1">Endet am {a.endAm}</p>
              ) : null}
            </div>
            {a.status === "aktiv" ? (
              <button
                type="button"
                className="btn-pill-outline portal-btn-compact text-red-700 border-red-200"
                disabled={busy === a.id}
                onClick={() => void kuendigen(a.id)}
              >
                {busy === a.id ? "…" : "Kündigen"}
              </button>
            ) : (
              <span className="tag bg-amber-100 text-amber-900">Gekündigt</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
