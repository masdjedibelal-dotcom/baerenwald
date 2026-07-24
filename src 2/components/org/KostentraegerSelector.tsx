"use client";

import { useState } from "react";

import {
  KOSTENTRAEGER,
  KOSTENTRAEGER_LABELS,
  type Kostentraeger,
} from "@/lib/vorgang/kostentraeger";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  leadId: string;
  value?: string | null;
  vorgeschlagen?: boolean;
  versicherungsNr?: string | null;
  onSaved?: () => void;
  readOnly?: boolean;
};

export function KostentraegerSelector({
  leadId,
  value,
  vorgeschlagen,
  versicherungsNr,
  onSaved,
  readOnly,
}: Props) {
  const [kt, setKt] = useState(value ?? "");
  const [versNr, setVersNr] = useState(versicherungsNr ?? "");
  const [busy, setBusy] = useState(false);

  async function speichern(next?: Kostentraeger, nrOverride?: string) {
    const chosen = next ?? kt;
    if (!chosen) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/leads/${leadId}/kostentraeger`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostentraeger: chosen,
          versicherungs_nr:
            chosen === "versicherung"
              ? (nrOverride ?? versNr) || undefined
              : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      portalToastSuccess(
        chosen === "versicherung"
          ? "Versicherung gesetzt — Schadenakte wird aktualisiert."
          : "Kostenträger gespeichert."
      );
      onSaved?.();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (readOnly && value) {
    return (
      <p className="portal-text-body">
        Kostenträger:{" "}
        <strong>{KOSTENTRAEGER_LABELS[value as Kostentraeger] ?? value}</strong>
      </p>
    );
  }

  const isVersicherung = kt === "versicherung" || value === "versicherung";

  return (
    <div className="space-y-3 rounded-xl border border-border-default bg-muted/30 p-3">
      <div className="space-y-2">
        <p className="portal-text-meta font-semibold text-text-secondary">
          Abrechnung über Versicherung?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => {
              setKt("versicherung");
              void speichern("versicherung");
            }}
            className={
              isVersicherung
                ? "btn-pill-primary portal-btn-compact"
                : "btn-pill-outline portal-btn-compact"
            }
          >
            Ja
          </button>
          <button
            type="button"
            disabled={busy || readOnly || !isVersicherung}
            onClick={() => {
              setKt("unklar");
              void speichern("unklar");
            }}
            className={
              !isVersicherung && kt
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
      </div>

      <div className="space-y-2 border-t border-border-light pt-3">
        <p className="portal-text-meta font-semibold text-text-secondary">
          Kostenträger
          {vorgeschlagen ? (
            <span className="ml-2 font-normal text-accent">(Vorschlag)</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {KOSTENTRAEGER.map((k) => (
            <button
              key={k}
              type="button"
              disabled={busy || readOnly}
              onClick={() => {
                setKt(k);
                void speichern(k);
              }}
              className={
                kt === k || value === k
                  ? "btn-pill-primary portal-btn-compact"
                  : "btn-pill-outline portal-btn-compact"
              }
            >
              {KOSTENTRAEGER_LABELS[k]}
            </button>
          ))}
        </div>
        {isVersicherung && !readOnly ? (
          <input
            type="text"
            value={versNr}
            onChange={(e) => setVersNr(e.target.value)}
            onBlur={() => void speichern("versicherung")}
            placeholder="Policen- / Versicherungsnummer"
            className="input-field w-full max-w-xs"
          />
        ) : null}
      </div>
    </div>
  );
}
