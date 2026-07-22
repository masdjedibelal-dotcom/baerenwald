"use client";

import { useState } from "react";

import {
  EinstellungenCard,
  EinstellungenEdField,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde, FreigabeModus } from "@/lib/org/types";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  embedded?: boolean;
  readOnly?: boolean;
};

export function OrganisationEinstellungenPanel({
  kunde,
  onSaved,
  embedded = false,
  readOnly = false,
}: Props) {
  const [kleinreparaturAktiv, setKleinreparaturAktiv] = useState(
    kunde.kleinreparatur_aktiv === true
  );
  const [kleinreparaturSchwelle, setKleinreparaturSchwelle] = useState(
    String(kunde.kleinreparatur_schwelle_eur ?? 200)
  );
  const [freigabeModus, setFreigabeModus] = useState<FreigabeModus>(
    kunde.freigabe_modus ?? "direkt"
  );
  const [notfallDirekt, setNotfallDirekt] = useState(kunde.notfall_direkt !== false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
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

  const readOnlyNote = readOnly ? (
    <p
      className="rounded-[9px] border border-border-default px-3.5 py-[11px] text-[13px] leading-[1.55]"
      style={{ color: PORTAL_C.sub }}
    >
      Nur Administratoren können Freigabe-Regeln und Schwellen ändern.
    </p>
  ) : null;

  const meldungenCard = (
    <EinstellungenCard title="Meldungen">
      <div className="flex flex-col gap-3">
        {readOnlyNote}
        <EinstellungenToggle
          checked={kleinreparaturAktiv}
          disabled={readOnly}
          onChange={setKleinreparaturAktiv}
          title="Kleinreparatur: Handwerker sofort ausrücken"
          description="Wenn aktiv: Bei Meldungen bis zur Schwelle unten können Sie „Sofort beauftragen“ wählen. Der Handwerker wird ohne formales Angebot beauftragt und rückt direkt aus."
        />
        {kleinreparaturAktiv ? (
          <EinstellungenEdField
            label="Bis zu diesem Betrag (€ netto) — Sofort-Ausrückung"
            type="number"
            value={kleinreparaturSchwelle}
            disabled={readOnly}
            onChange={setKleinreparaturSchwelle}
          />
        ) : null}
      </div>
    </EinstellungenCard>
  );

  const angeboteCard = (
    <EinstellungenCard title="Angebote & Notfall">
      <div className="flex flex-col gap-3">
        {!embedded ? readOnlyNote : null}
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
            Freigabe-Modus
          </span>
          <p
            className="mb-1 text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            Bei „Freigabe“ müssen Angebote oberhalb Ihrer Freigabeschwelle erst
            von Ihnen freigegeben werden. Unter der Schwelle startet die
            Durchführung direkt — ohne Freigabe-Button.
          </p>
          <select
            className="w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
            value={freigabeModus}
            onChange={(e) => setFreigabeModus(e.target.value as FreigabeModus)}
            disabled={readOnly}
          >
            <option value="direkt">Direkt — ohne Freigabe</option>
            <option value="freigabe">Freigabe erforderlich (über Schwelle)</option>
          </select>
        </label>
        <EinstellungenToggle
          checked={notfallDirekt}
          disabled={readOnly}
          onChange={setNotfallDirekt}
          title="Notfall: Handwerker sofort ausrücken"
          description="Bei Notfall-Meldungen wird der Handwerker sofort angefragt und kann direkt ausrücken — ohne dass Sie freigeben müssen."
        />
      </div>
    </EinstellungenCard>
  );

  if (embedded) {
    return (
      <form onSubmit={save} className="contents">
        {meldungenCard}
        {angeboteCard}
        {message ? (
          <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
            {message}
          </p>
        ) : null}
        {!readOnly ? (
          <button
            type="submit"
            className="btn-pill-primary w-full sm:w-auto"
            disabled={busy}
          >
            Regeln speichern
          </button>
        ) : null}
      </form>
    );
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-6">
      <div
        className="rounded-[9px] border border-border-default px-3.5 py-[11px] text-[13px] leading-[1.55]"
        style={{ color: PORTAL_C.sub }}
      >
        <p className="mb-1 font-semibold text-text-primary">Datenschutz-Hinweis</p>
        <p>
          Als Verwaltung sind Sie gegenüber Mietern für die Rechtmäßigkeit der
          Datenübermittlung verantwortlich. Bitte informieren Sie Mieter über den
          Melde-Link.
        </p>
      </div>
      {meldungenCard}
      {angeboteCard}
      {message ? (
        <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
          {message}
        </p>
      ) : null}
      {!readOnly ? (
        <button type="submit" className="btn-pill-primary" disabled={busy}>
          Speichern
        </button>
      ) : null}
    </form>
  );
}
