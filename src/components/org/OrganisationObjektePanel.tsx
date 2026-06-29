"use client";

import { useState } from "react";

import { buildMeldeUrl, buildMeldeQrUrl } from "@/lib/org/melde-url";
import { suggestMeldeSlugFromAddress } from "@/lib/org/slug";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  onRefresh: () => void;
};

export function OrganisationObjektePanel({ kunde, objekte, onRefresh }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [titel, setTitel] = useState("");
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [meldeSlug, setMeldeSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const orgKennung = kunde.org_kennung ?? "";

  const suggestSlug = () => {
    setMeldeSlug(suggestMeldeSlugFromAddress(strasse, hausnummer, plz));
  };

  const createObjekt = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/objekte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          strasse,
          hausnummer,
          plz,
          ort,
          melde_slug: meldeSlug,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      orgPortalToast.objektAngelegt();
      setFormOpen(false);
      setTitel("");
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleAktiv = async (o: OrganisationObjekt) => {
    await fetch("/api/org/objekte", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, melde_aktiv: !o.melde_aktiv }),
    });
    onRefresh();
  };

  const copyLink = async (slug: string) => {
    const url = buildMeldeUrl(orgKennung, slug);
    await navigator.clipboard.writeText(url);
  };

  const showQr = (slug: string) => {
    setQrUrl(buildMeldeQrUrl(buildMeldeUrl(orgKennung, slug)));
  };

  const empty = objekte.length === 0;

  return (
    <div className="space-y-4">
      {empty ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-text-secondary">
          Noch keine Objekte. Lege ein Objekt an und kopiere den Melde-Link fürs
          Treppenhaus.
        </div>
      ) : null}

      <ul className="space-y-2">
        {objekte.map((o) => (
          <li
            key={o.id}
            className="rounded-xl border border-border-light bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{o.titel}</p>
                <p className="text-sm text-text-secondary">
                  {[o.strasse, o.hausnummer, o.plz, o.ort]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                {o.melde_slug ? (
                  <p className="text-xs text-text-tertiary mt-1">
                    /melden/{orgKennung}/{o.melde_slug}
                  </p>
                ) : null}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${o.melde_aktiv ? "bg-emerald-100 text-emerald-800" : "bg-muted text-text-tertiary"}`}
              >
                {o.melde_aktiv ? "Link aktiv" : "Link aus"}
              </span>
            </div>
            {o.melde_slug ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() => copyLink(o.melde_slug!)}
                >
                  Link kopieren
                </button>
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() => showQr(o.melde_slug!)}
                >
                  QR anzeigen
                </button>
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() =>
                    window.open(
                      `/api/org/melde-aushang?objektId=${encodeURIComponent(o.id)}`,
                      "_blank"
                    )
                  }
                >
                  Aushang PDF
                </button>
                <button
                  type="button"
                  className="btn-pill-outline !py-1.5 !text-xs"
                  onClick={() => toggleAktiv(o)}
                >
                  {o.melde_aktiv ? "Deaktivieren" : "Aktivieren"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {qrUrl ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-xs w-full text-center">
            <img src={qrUrl} alt="QR-Code Melde-Link" className="mx-auto" />
            <button
              type="button"
              className="btn-pill-primary w-full mt-3"
              onClick={() => setQrUrl(null)}
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <form onSubmit={createObjekt} className="rounded-xl border p-4 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Titel / Bezeichnung"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="col-span-2 border rounded-lg px-3 py-2"
              placeholder="Straße"
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Nr."
              value={hausnummer}
              onChange={(e) => setHausnummer(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="PLZ"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Ort"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Link-Name (Slug)"
              value={meldeSlug}
              onChange={(e) => setMeldeSlug(e.target.value)}
              required
            />
            <button type="button" className="btn-pill-outline" onClick={suggestSlug}>
              Vorschlag
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-pill-outline flex-1"
              onClick={() => setFormOpen(false)}
            >
              Abbrechen
            </button>
            <button type="submit" className="btn-pill-primary flex-1" disabled={busy}>
              Speichern
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn-pill-primary"
          onClick={() => setFormOpen(true)}
        >
          Objekt anlegen
        </button>
      )}
    </div>
  );
}
