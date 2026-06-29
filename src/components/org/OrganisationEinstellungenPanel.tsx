"use client";

import { useState } from "react";

import type { OrganisationKunde, FreigabeModus } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
};

export function OrganisationEinstellungenPanel({ kunde, onSaved }: Props) {
  const [kleinreparaturAktiv, setKleinreparaturAktiv] = useState(
    kunde.kleinreparatur_aktiv === true
  );
  const [kleinreparaturSchwelle, setKleinreparaturSchwelle] = useState(
    String(kunde.kleinreparatur_schwelle_eur ?? 200)
  );
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
          kleinreparatur_aktiv: kleinreparaturAktiv,
          kleinreparatur_schwelle_eur: Number(kleinreparaturSchwelle) || 200,
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
      orgPortalToast.einstellungenGespeichert();
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-lg space-y-6">
      <div className="rounded-xl border border-border-light bg-muted/20 p-3 text-xs text-text-secondary">
        <p className="font-medium text-text-primary mb-1">Datenschutz-Hinweis</p>
        <p>
          Als Hausverwaltung sind Sie gegenüber Mietern für die Rechtmäßigkeit der
          Datenübermittlung verantwortlich. Bitte informieren Sie Mieter über den
          Melde-Link.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Block A — Meldungen</h3>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={kleinreparaturAktiv}
            onChange={(e) => setKleinreparaturAktiv(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Kleinreparatur ohne Angebot erlauben (optional, standardmäßig aus)
          </span>
        </label>
        {kleinreparaturAktiv ? (
          <div>
            <label className="text-sm text-text-secondary">
              Schwelle Kleinreparatur (€ netto, Standard 200)
            </label>
            <input
              type="number"
              className="w-full mt-1 border rounded-lg px-3 py-2"
              value={kleinreparaturSchwelle}
              onChange={(e) => setKleinreparaturSchwelle(e.target.value)}
              min={1}
              max={500}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Block B — Angebote</h3>
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
              Schwelle Angebots-Freigabe (€ brutto, optional)
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
          Notfall-Angebote umgehen Freigabe-Schwelle
        </label>
      </section>

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      <button type="submit" className="btn-pill-primary" disabled={busy}>
        Speichern
      </button>
    </form>
  );
}
