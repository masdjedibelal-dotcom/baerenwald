"use client";

import { useState } from "react";

import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import type { OrganisationObjekt } from "@/lib/org/types";

type Props = {
  objekte: OrganisationObjekt[];
  onDone: () => void;
};

export function OrganisationMeldungErfassenForm({ objekte, onDone }: Props) {
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [melderName, setMelderName] = useState("");
  const [melderEmail, setMelderEmail] = useState("");
  const [melderTelefon, setMelderTelefon] = useState("");
  const [melderEinheit, setMelderEinheit] = useState("");
  const [kategorie, setKategorie] = useState("reparatur");
  const [beschreibung, setBeschreibung] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/org/meldung-vorab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          melderName,
          melderEmail,
          melderTelefon,
          melderEinheit,
          kategorie,
          beschreibung,
        }),
      });
      const json = (await res.json()) as { error?: string; link?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Fehler");
        return;
      }
      setLink(json.link ?? null);
      setMessage("Einladung erstellt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm text-text-secondary">Objekt</label>
        <select
          className="w-full mt-1 border rounded-lg px-3 py-2"
          value={objektId}
          onChange={(e) => setObjektId(e.target.value)}
          required
        >
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titel}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-text-secondary">Kategorie</label>
        <select
          className="w-full mt-1 border rounded-lg px-3 py-2"
          value={kategorie}
          onChange={(e) => setKategorie(e.target.value)}
        >
          {MELDE_KATEGORIEN.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Name Melder"
        value={melderName}
        onChange={(e) => setMelderName(e.target.value)}
        required
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="E-Mail Melder"
        type="email"
        value={melderEmail}
        onChange={(e) => setMelderEmail(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Telefon"
        value={melderTelefon}
        onChange={(e) => setMelderTelefon(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Einheit"
        value={melderEinheit}
        onChange={(e) => setMelderEinheit(e.target.value)}
      />
      <textarea
        className="w-full border rounded-lg px-3 py-2"
        rows={3}
        placeholder="Kurznotiz für Melder"
        value={beschreibung}
        onChange={(e) => setBeschreibung(e.target.value)}
      />
      <p className="text-xs text-text-tertiary rounded-lg bg-muted/30 p-2">
        Hinweis: Bitte Melderdaten nur übermitteln, wenn eine rechtliche Grundlage
        vorliegt (z. B. Mietverhältnis/Verwaltung). Die betroffene Person muss über
        die Datenverarbeitung informiert werden.
      </p>
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {link ? (
        <p className="text-xs break-all text-text-tertiary">
          Link: {link}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className="btn-pill-outline flex-1" onClick={onDone}>
          Schließen
        </button>
        <button type="submit" className="btn-pill-primary flex-1" disabled={busy}>
          Einladung senden
        </button>
      </div>
    </form>
  );
}
