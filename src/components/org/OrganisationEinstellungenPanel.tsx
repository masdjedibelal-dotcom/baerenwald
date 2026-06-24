"use client";

import { useState } from "react";

import type { OrganisationKunde, FreigabeModus } from "@/lib/org/types";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
};

export function OrganisationEinstellungenPanel({ kunde, onSaved }: Props) {
  const [freigabeModus, setFreigabeModus] = useState<FreigabeModus>(
    kunde.freigabe_modus ?? "direkt"
  );
  const [schwelle, setSchwelle] = useState(
    kunde.freigabe_schwelle_eur != null ? String(kunde.freigabe_schwelle_eur) : ""
  );
  const [notfallDirekt, setNotfallDirekt] = useState(kunde.notfall_direkt !== false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freigabe_modus: freigabeModus,
          freigabe_schwelle_eur: schwelle ? Number(schwelle) : null,
          notfall_direkt: notfallDirekt,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Fehler");
        return;
      }
      setMessage("Gespeichert.");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <div>
        <p className="text-sm font-medium">Freigabe-Modus</p>
        <p className="text-xs text-text-tertiary mb-2">
          Bei „Freigabe“ müssen Angebote oberhalb der Schwelle erst von Ihnen
          freigegeben werden.
        </p>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={freigabeModus}
          onChange={(e) => setFreigabeModus(e.target.value as FreigabeModus)}
        >
          <option value="direkt">Direkt — ohne Freigabe</option>
          <option value="freigabe">Freigabe erforderlich</option>
        </select>
      </div>

      {freigabeModus === "freigabe" ? (
        <div>
          <label className="text-sm text-text-secondary">
            Schwelle (€ brutto, optional)
          </label>
          <input
            type="number"
            className="w-full mt-1 border rounded-lg px-3 py-2"
            value={schwelle}
            onChange={(e) => setSchwelle(e.target.value)}
            placeholder="z. B. 2000"
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notfallDirekt}
          onChange={(e) => setNotfallDirekt(e.target.checked)}
        />
        Notfall-Meldungen umgehen Freigabe
      </label>

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      <button type="submit" className="btn-pill-primary" disabled={busy}>
        Speichern
      </button>
    </form>
  );
}
