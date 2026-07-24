"use client";

import { useState } from "react";

import { orgHasMieterKontakt, orgWhitelabelReady } from "@/lib/org/org-mieter-kontakt";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EinstellungenCard,
  EinstellungenEdField,
} from "@/components/shared/PortalEinstellungenUi";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  readOnly?: boolean;
  nested?: boolean;
};

export function OrganisationMieterKontaktPanel({
  kunde,
  onSaved,
  readOnly = false,
  nested = false,
}: Props) {
  const [tel, setTel] = useState(kunde.mieter_kontakt_telefon ?? "");
  const [mail, setMail] = useState(kunde.mieter_kontakt_email ?? "");
  const [hint, setHint] = useState(kunde.mieter_kontakt_hinweis ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = orgWhitelabelReady(kunde);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    if (!orgHasMieterKontakt({ mieter_kontakt_telefon: tel, mieter_kontakt_email: mail })) {
      setError("Bitte mindestens Telefon oder E-Mail angeben.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/org/whitelabel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mieter_kontakt_telefon: tel,
          mieter_kontakt_email: mail,
          mieter_kontakt_hinweis: hint || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      orgPortalToast.saved();
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const formBody = (
    <form onSubmit={save} className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
        Erscheint in Melde-Flow, Status-Seite und E-Mails an Mieter (White-Label).
      </p>
      <div className="flex items-start justify-between gap-3">
        {!ready ? (
          <span className="tag shrink-0 bg-amber-100 text-amber-900">Unvollständig</span>
        ) : (
          <span className="tag shrink-0 bg-emerald-100 text-emerald-800">Aktiv</span>
        )}
      </div>
      <EinstellungenEdField
        label="Telefon"
        type="tel"
        value={tel}
        disabled={readOnly}
        onChange={setTel}
      />
      <EinstellungenEdField
        label="E-Mail"
        type="email"
        value={mail}
        disabled={readOnly}
        onChange={setMail}
      />
      <EinstellungenEdField
        label="Hinweis (optional)"
        value={hint}
        disabled={readOnly}
        onChange={setHint}
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!readOnly ? (
        <button type="submit" className="btn-pill-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Speichern…" : "Kontakt speichern"}
        </button>
      ) : null}
      {kunde.av_akzeptiert_am ? (
        <p className="text-[11.5px] text-text-tertiary">
          AV akzeptiert am{" "}
          {new Date(kunde.av_akzeptiert_am).toLocaleDateString("de-DE")}
          {kunde.av_version ? ` (Version ${kunde.av_version})` : ""}
        </p>
      ) : null}
    </form>
  );

  if (nested) {
    return (
      <EinstellungenCard title="Mieter-Kommunikation">{formBody}</EinstellungenCard>
    );
  }

  return (
    <section className="portal-surface space-y-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text-primary">Mieter-Kommunikation</h2>
          <p className="portal-text-meta mt-1 text-text-secondary">
            Erscheint in Melde-Flow, Status-Seite und E-Mails an Mieter (White-Label).
          </p>
        </div>
        {!ready ? (
          <span className="tag shrink-0 bg-amber-100 text-amber-900">Unvollständig</span>
        ) : (
          <span className="tag shrink-0 bg-emerald-100 text-emerald-800">Aktiv</span>
        )}
      </div>
      {formBody}
    </section>
  );
}
