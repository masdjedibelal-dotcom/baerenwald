"use client";

import { useState } from "react";

import type { OrganisationObjekt } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  objekte: OrganisationObjekt[];
  onRefresh: () => void;
};

type EditState = {
  id: string;
  titel: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  kostenstelle_nr: string;
};

export function OrganisationObjektePanel({ objekte, onRefresh }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [titel, setTitel] = useState("");
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitel("");
    setStrasse("");
    setHausnummer("");
    setPlz("");
    setOrt("");
    setFormOpen(false);
    setError(null);
  };

  const createObjekt = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/objekte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titel, strasse, hausnummer, plz, ort }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      orgPortalToast.objektAngelegt();
      resetForm();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      orgPortalToast.objektAktualisiert();
      setEdit(null);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleAktiv = async (o: OrganisationObjekt) => {
    const res = await fetch("/api/org/objekte", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, melde_aktiv: !o.melde_aktiv }),
    });
    if (res.ok) onRefresh();
  };

  const empty = objekte.length === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="portal-text-section text-text-primary">Objekte</h2>
        <p className="portal-text-body text-text-secondary">
          Gebäude und WEGs für die Mieter-Auswahl im Meldeformular.
        </p>
      </div>

      {empty ? (
        <div className="card-bordered p-6 text-center portal-text-body text-text-secondary">
          Noch keine Objekte. Legen Sie Ihr erstes Gebäude an — Link und Aushang
          finden Sie unter Profil.
        </div>
      ) : null}

      <ul className="space-y-2">
        {objekte.map((o) =>
          edit?.id === o.id ? (
            <li key={o.id} className="card-bordered p-4">
              <form onSubmit={saveEdit} className="space-y-3">
                <input
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  placeholder="Titel / Bezeichnung"
                  value={edit.titel}
                  onChange={(e) => setEdit({ ...edit, titel: e.target.value })}
                  required
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="portal-input col-span-2 rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="Straße"
                    value={edit.strasse}
                    onChange={(e) => setEdit({ ...edit, strasse: e.target.value })}
                  />
                  <input
                    className="portal-input rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="Nr."
                    value={edit.hausnummer}
                    onChange={(e) => setEdit({ ...edit, hausnummer: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="portal-input rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="PLZ"
                    value={edit.plz}
                    onChange={(e) => setEdit({ ...edit, plz: e.target.value })}
                  />
                  <input
                    className="portal-input rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="Ort"
                    value={edit.ort}
                    onChange={(e) => setEdit({ ...edit, ort: e.target.value })}
                  />
                </div>
                <input
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  placeholder="Kostenstelle (optional)"
                  value={edit.kostenstelle_nr}
                  onChange={(e) => setEdit({ ...edit, kostenstelle_nr: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-pill-outline flex-1"
                    onClick={() => setEdit(null)}
                  >
                    Abbrechen
                  </button>
                  <button type="submit" className="btn-pill-primary flex-1" disabled={busy}>
                    Speichern
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={o.id} className="card-bordered p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="portal-text-body font-medium">{o.titel}</p>
                  <p className="portal-text-meta text-text-secondary">
                    {[o.strasse, o.hausnummer, o.plz, o.ort].filter(Boolean).join(" ")}
                  </p>
                  {o.kostenstelle_nr ? (
                    <p className="portal-text-meta text-text-tertiary">
                      Kostenstelle: {o.kostenstelle_nr}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    o.melde_aktiv
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-text-tertiary"
                  }`}
                >
                  {o.melde_aktiv ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() =>
                    setEdit({
                      id: o.id,
                      titel: o.titel,
                      strasse: o.strasse ?? "",
                      hausnummer: o.hausnummer ?? "",
                      plz: o.plz ?? "",
                      ort: o.ort ?? "",
                      kostenstelle_nr: o.kostenstelle_nr ?? "",
                    })
                  }
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() => toggleAktiv(o)}
                >
                  {o.melde_aktiv ? "Deaktivieren" : "Aktivieren"}
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {formOpen ? (
        <form onSubmit={createObjekt} className="card-bordered space-y-3 p-4">
          <input
            className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            placeholder="Titel / Bezeichnung"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="portal-input col-span-2 rounded-xl border border-border-default px-3 py-2.5"
              placeholder="Straße"
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
            />
            <input
              className="portal-input rounded-xl border border-border-default px-3 py-2.5"
              placeholder="Nr."
              value={hausnummer}
              onChange={(e) => setHausnummer(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="portal-input rounded-xl border border-border-default px-3 py-2.5"
              placeholder="PLZ"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
            />
            <input
              className="portal-input rounded-xl border border-border-default px-3 py-2.5"
              placeholder="Ort"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button type="button" className="btn-pill-outline flex-1" onClick={resetForm}>
              Abbrechen
            </button>
            <button type="submit" className="btn-pill-primary flex-1" disabled={busy}>
              Objekt anlegen
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-pill-primary" onClick={() => setFormOpen(true)}>
          Objekt anlegen
        </button>
      )}
    </div>
  );
}
