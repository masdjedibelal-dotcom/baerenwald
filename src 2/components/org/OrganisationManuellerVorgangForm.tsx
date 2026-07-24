"use client";

import { useState } from "react";

import { KOSTENTRAEGER, KOSTENTRAEGER_LABELS } from "@/lib/vorgang/kostentraeger";
import type { OrganisationObjekt } from "@/lib/org/types";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  objekte: OrganisationObjekt[];
  onDone: () => void;
};

/** S5 — Manueller Vorgang ohne Mieter */
export function OrganisationManuellerVorgangForm({ objekte, onDone }: Props) {
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [versicherung, setVersicherung] = useState(false);
  const [versicherungsNr, setVersicherungsNr] = useState("");
  const [kostentraeger, setKostentraeger] = useState("gemeinschaft");
  const [preisNetto, setPreisNetto] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const kt = versicherung ? "versicherung" : kostentraeger;
      const res = await fetch("/api/org/vorgang-manuell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          beschreibung,
          kundeObjektId: objektId,
          kostentraeger: kt,
          versicherungsNr: versicherung ? versicherungsNr || undefined : undefined,
          preisNetto: preisNetto ? Number(preisNetto) : 0,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(json.error ?? "Fehler");
        return;
      }
      orgPortalToast.meldungErfasst();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="portal-text-section text-text-primary">Manueller Vorgang</p>
        <p className="portal-text-body text-text-secondary">
          Ohne Mieter-Link — für Telefon, E-Mail oder interne Erfassung.
        </p>
      </div>
      <label className="block space-y-1">
        <span className="portal-form-label">Objekt</span>
        <select
          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
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
      </label>
      <label className="block space-y-1">
        <span className="portal-form-label">Titel</span>
        <input
          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z. B. Heizungsausfall EG"
          required
          minLength={4}
        />
      </label>
      <label className="block space-y-1">
        <span className="portal-form-label">Beschreibung</span>
        <textarea
          className="portal-input min-h-[100px] w-full rounded-xl border border-border-default px-3 py-2.5"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          required
          minLength={8}
        />
      </label>

      <div className="space-y-2 rounded-xl border border-border-default bg-muted/30 p-3">
        <p className="portal-form-label">Abrechnung über Versicherung?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setVersicherung(true);
              setKostentraeger("versicherung");
            }}
            className={
              versicherung
                ? "btn-pill-primary portal-btn-compact"
                : "btn-pill-outline portal-btn-compact"
            }
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => {
              setVersicherung(false);
              if (kostentraeger === "versicherung") setKostentraeger("gemeinschaft");
            }}
            className={
              !versicherung
                ? "btn-pill-primary portal-btn-compact"
                : "btn-pill-outline portal-btn-compact"
            }
          >
            Nein
          </button>
        </div>
        <p className="text-xs text-text-tertiary">
          Bei Ja erstellen wir die Schadenakte automatisch für die Einreichung.
        </p>
        {versicherung ? (
          <input
            type="text"
            className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            value={versicherungsNr}
            onChange={(e) => setVersicherungsNr(e.target.value)}
            placeholder="Policen- / Versicherungsnummer (optional)"
          />
        ) : null}
      </div>

      {!versicherung ? (
        <label className="block space-y-1">
          <span className="portal-form-label">Kostenträger</span>
          <select
            className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            value={kostentraeger}
            onChange={(e) => setKostentraeger(e.target.value)}
          >
            {KOSTENTRAEGER.filter((k) => k !== "versicherung").map((k) => (
              <option key={k} value={k}>
                {KOSTENTRAEGER_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="portal-form-label">Geschätzter Netto-Preis (optional)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
          value={preisNetto}
          onChange={(e) => setPreisNetto(e.target.value)}
          placeholder="0 = unbekannt"
        />
      </label>
      <button type="submit" className="btn-pill-primary w-full" disabled={busy}>
        {busy ? "Wird angelegt…" : "Vorgang anlegen"}
      </button>
    </form>
  );
}
