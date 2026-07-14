"use client";

import { useState } from "react";

import { orgHasMieterKontakt, orgWhitelabelReady } from "@/lib/org/org-mieter-kontakt";
import type { OrganisationKunde } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  readOnly?: boolean;
};

export function OrganisationMieterKontaktPanel({
  kunde,
  onSaved,
  readOnly = false,
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

  return (
    <section className="card-bordered space-y-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text-primary">Mieter-Kommunikation</h2>
          <p className="portal-text-meta mt-1 text-text-secondary">
            Erscheint in Melde-Flow, Status-Seite und E-Mails an Mieter (White-Label).
          </p>
        </div>
        {!ready ? (
          <span className="tag bg-amber-100 text-amber-900 shrink-0">Unvollständig</span>
        ) : (
          <span className="tag bg-emerald-100 text-emerald-800 shrink-0">Aktiv</span>
        )}
      </div>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="portal-text-meta text-text-secondary" htmlFor="mk-tel">
            Telefon
          </label>
          <input
            id="mk-tel"
            type="tel"
            disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm disabled:opacity-60"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
          />
        </div>
        <div>
          <label className="portal-text-meta text-text-secondary" htmlFor="mk-mail">
            E-Mail
          </label>
          <input
            id="mk-mail"
            type="email"
            disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm disabled:opacity-60"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
          />
        </div>
        <div>
          <label className="portal-text-meta text-text-secondary" htmlFor="mk-hint">
            Hinweis (optional)
          </label>
          <input
            id="mk-hint"
            type="text"
            disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm disabled:opacity-60"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {!readOnly ? (
          <button type="submit" className="btn-pill-primary" disabled={busy}>
            {busy ? "Speichern…" : "Kontakt speichern"}
          </button>
        ) : null}
      </form>

      {kunde.av_akzeptiert_am ? (
        <p className="portal-text-meta text-text-tertiary">
          AV akzeptiert am{" "}
          {new Date(kunde.av_akzeptiert_am).toLocaleDateString("de-DE")}
          {kunde.av_version ? ` (Version ${kunde.av_version})` : ""}
        </p>
      ) : null}
    </section>
  );
}
