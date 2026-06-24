"use client";

import { useState } from "react";

import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import { mapToPrice } from "@/lib/funnel/price-calc";
import type { FunnelState } from "@/lib/funnel/types";
import type { OrganisationObjekt } from "@/lib/org/types";

type Props = {
  objekte: OrganisationObjekt[];
  kundeEmail?: string | null;
  kundeName?: string | null;
  onDone: () => void;
};

const PROJEKT_BEREICHE: Record<string, { id: string; label: string }[]> = {
  erneuern: [
    { id: "maler", label: "Maler" },
    { id: "boden", label: "Boden" },
    { id: "bad", label: "Bad" },
    { id: "fassade", label: "Fassade" },
  ],
  kaputt: [
    { id: "sanitaer", label: "Sanitär" },
    { id: "heizung", label: "Heizung" },
    { id: "strom", label: "Elektro" },
  ],
  betreuung: [
    { id: "garten", label: "Garten" },
    { id: "hausmeister", label: "Hausmeister" },
  ],
};

export function OrganisationProjektFunnel({
  objekte,
  kundeEmail,
  kundeName,
  onDone,
}: Props) {
  const [situation, setSituation] = useState<string>("erneuern");
  const [bereich, setBereich] = useState("maler");
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [beschreibung, setBeschreibung] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bereiche = PROJEKT_BEREICHE[situation] ?? PROJEKT_BEREICHE.erneuern;

  const preis = (() => {
    const state = {
      situation,
      bereiche: [bereich],
      fachdetails: {},
      umfang: null,
      groesse: 80,
      plz: objekte.find((o) => o.id === objektId)?.plz ?? "80331",
    } as FunnelState;
    const mapped = mapToPrice(state);
    if (!mapped?.customPriceRange) return null;
    return mapped.customPriceRange;
  })();

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anlass: "projekt",
          objektId,
          situation,
          bereiche: [bereich],
          preis_min: preis?.min ?? 0,
          preis_max: preis?.max ?? 0,
          name: kundeName,
          email: kundeEmail,
          beschreibung,
          funnel_daten: { org_projekt: true, bereich },
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-secondary mb-2">Art des Vorhabens</p>
        <div className="grid grid-cols-2 gap-2">
          {BW_FUNNEL_STEP1_OPTIONS.filter((o) => o.id !== "gewerbe").map((o) => (
            <button
              key={o.id}
              type="button"
              className={`border rounded-lg p-3 text-left text-sm ${situation === o.id ? "border-emerald-600 bg-emerald-50" : ""}`}
              onClick={() => {
                setSituation(o.id);
                const first = PROJEKT_BEREICHE[o.id]?.[0]?.id;
                if (first) setBereich(first);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-text-secondary mb-2">Gewerk</p>
        <div className="flex flex-wrap gap-2">
          {bereiche.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`btn-pill-outline !py-1.5 ${bereich === b.id ? "!bg-muted" : ""}`}
              onClick={() => setBereich(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <select
        className="w-full border rounded-lg px-3 py-2"
        value={objektId}
        onChange={(e) => setObjektId(e.target.value)}
      >
        {objekte.map((o) => (
          <option key={o.id} value={o.id}>
            {o.titel}
          </option>
        ))}
      </select>

      <textarea
        className="w-full border rounded-lg px-3 py-2"
        rows={3}
        placeholder="Details zum Projekt"
        value={beschreibung}
        onChange={(e) => setBeschreibung(e.target.value)}
      />

      {preis ? (
        <p className="text-sm font-medium">
          Preisrahmen: ca. {preis.min.toLocaleString("de-DE")}–
          {preis.max.toLocaleString("de-DE")} €
        </p>
      ) : (
        <p className="text-sm text-text-secondary">
          Preisrahmen nach Prüfung durch unser Team.
        </p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button type="button" className="btn-pill-outline flex-1" onClick={onDone}>
          Abbrechen
        </button>
        <button
          type="button"
          className="btn-pill-primary flex-1"
          disabled={busy}
          onClick={submit}
        >
          Anfrage senden
        </button>
      </div>
    </div>
  );
}
