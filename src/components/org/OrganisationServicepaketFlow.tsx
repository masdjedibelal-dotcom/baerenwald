"use client";

import { useCallback, useState } from "react";

import { HausserviceProduktPicker } from "@/components/products/conversion/HausserviceProduktPicker";
import {
  computeHausserviceEinzelMonatPreis,
  type EinzelServiceId,
} from "@/lib/org/hausservice-einzel-preis";
import type { OrganisationObjekt } from "@/lib/org/types";
import { getProdukteByFamilie } from "@/lib/products";
import { computeHausserviceMonatPreis } from "@/lib/products/hausservice-preis";
import type { HausserviceStufe } from "@/lib/products/types";
import { HAUSSERVICE_FEATURE_MATRIX } from "@/lib/products/hausservice-feature-matrix";
import { HAUSSERVICE_DEFAULT_PRODUKT_SLUG } from "@/lib/products/katalog-hausservice";

type Props = {
  objekte: OrganisationObjekt[];
  kundeEmail?: string | null;
  kundeName?: string | null;
  onDone: () => void;
};

export function OrganisationServicepaketFlow({
  objekte,
  kundeEmail,
  kundeName,
  onDone,
}: Props) {
  const [tab, setTab] = useState<"paket" | "einzeln">("paket");
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [wohnflaeche, setWohnflaeche] = useState(100);
  const [gartenQm, setGartenQm] = useState(80);
  const [selectedPaket, setSelectedPaket] = useState(HAUSSERVICE_DEFAULT_PRODUKT_SLUG);
  const produktSlugs = getProdukteByFamilie("hausservice").map((p) => p.slug);
  const [einzel, setEinzel] = useState<EinzelServiceId[]>(["hausmeister"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preisInput = { wohnflaeche, gartenQm };
  const einzelPreis = computeHausserviceEinzelMonatPreis(einzel, preisInput);

  const paketStufe: HausserviceStufe = selectedPaket.endsWith("premium")
    ? "premium"
    : selectedPaket.endsWith("komfort")
      ? "komfort"
      : "basis";
  const paketPreis = computeHausserviceMonatPreis(paketStufe, preisInput);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const funnel_daten =
        tab === "paket"
          ? { hausservice_stufe: selectedPaket, wohnflaeche, garten_qm: gartenQm }
          : { einzel_services: einzel, wohnflaeche, garten_qm: gartenQm };

      const preis =
        tab === "einzeln"
          ? einzelPreis
          : paketPreis;

      const res = await fetch("/api/org/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anlass: "servicepaket",
          objektId,
          situation: "betreuung",
          bereiche: ["hausmeister"],
          service_modus: tab === "paket" ? "paket" : "einzeln",
          preis_min: preis.min,
          preis_max: preis.max,
          funnel_daten,
          name: kundeName,
          email: kundeEmail,
          beschreibung:
            tab === "paket"
              ? `Servicepaket ${selectedPaket}`
              : `Einzel-Services: ${einzel.join(", ")}`,
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

  const toggleEinzel = useCallback((id: EinzelServiceId) => {
    setEinzel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={`btn-pill-outline flex-1 ${tab === "paket" ? "!bg-muted" : ""}`}
          onClick={() => setTab("paket")}
        >
          Paket
        </button>
        <button
          type="button"
          className={`btn-pill-outline flex-1 ${tab === "einzeln" ? "!bg-muted" : ""}`}
          onClick={() => setTab("einzeln")}
        >
          Einzeln
        </button>
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

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          className="border rounded-lg px-3 py-2"
          value={wohnflaeche}
          onChange={(e) => setWohnflaeche(Number(e.target.value))}
          placeholder="m² Wohnfläche"
        />
        <input
          type="number"
          className="border rounded-lg px-3 py-2"
          value={gartenQm}
          onChange={(e) => setGartenQm(Number(e.target.value))}
          placeholder="m² Garten"
        />
      </div>

      {tab === "paket" ? (
        <HausserviceProduktPicker
          produktSlugs={produktSlugs}
          selectedSlug={selectedPaket}
          onSelect={setSelectedPaket}
          openCheckoutOnSelect={false}
          trackQuelle="org_portal"
        />
      ) : (
        <div className="space-y-2">
          {HAUSSERVICE_FEATURE_MATRIX.filter((r) => r.primary).map((row) => (
            <label key={row.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={einzel.includes(row.id as EinzelServiceId)}
                onChange={() => toggleEinzel(row.id as EinzelServiceId)}
              />
              <span>
                <span className="font-medium">{row.label}</span>
                {row.detail ? (
                  <span className="block text-text-tertiary text-xs">
                    {row.detail}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
          <p className="text-sm font-medium">
            ca. {einzelPreis.min}–{einzelPreis.max} € / Monat
          </p>
        </div>
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
