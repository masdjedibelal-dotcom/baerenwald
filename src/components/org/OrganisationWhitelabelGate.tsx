"use client";

import { useState } from "react";

import { getOrgAvTextForVersion } from "@/lib/org/org-av-text";
import {
  ORG_AV_VERSION_CURRENT,
  orgEffectiveMieterMail,
  orgEffectiveMieterTel,
  orgHasMieterKontakt,
  orgWhitelabelReady,
} from "@/lib/org/org-mieter-kontakt";
import {
  orgWhitelabelGateDaysRemaining,
  orgWhitelabelGateHardEnforced,
} from "@/lib/org/org-whitelabel-gate";
import type { OrganisationKunde } from "@/lib/org/types";
import { orgPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  canComplete: boolean;
  onComplete: () => void;
};

export function OrganisationWhitelabelGate({ kunde, canComplete, onComplete }: Props) {
  const [tel, setTel] = useState(orgEffectiveMieterTel(kunde));
  const [mail, setMail] = useState(orgEffectiveMieterMail(kunde));
  const [hint, setHint] = useState(kunde.mieter_kontakt_hinweis ?? "");
  const [avOk, setAvOk] = useState(Boolean(kunde.av_akzeptiert_am));
  const [avExpanded, setAvExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (orgWhitelabelReady(kunde)) return null;

  const hardEnforced = orgWhitelabelGateHardEnforced(kunde);
  const daysLeft = orgWhitelabelGateDaysRemaining(kunde);
  const avText = getOrgAvTextForVersion(ORG_AV_VERSION_CURRENT);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canComplete) return;
    setError(null);
    if (!avOk) {
      setError("Bitte den Auftragsverarbeitungsvertrag bestätigen.");
      return;
    }
    if (!orgHasMieterKontakt({ mieter_kontakt_telefon: tel, mieter_kontakt_email: mail })) {
      setError("Bitte mindestens Telefon oder E-Mail für Mieter-Rückfragen angeben.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/org/whitelabel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          av_akzeptiert: true,
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
      onComplete();
    } finally {
      setBusy(false);
    }
  }

  const panelClass =
    "portal-surface max-h-[90vh] w-full max-w-lg overflow-y-auto bg-surface-card p-5 sm:p-6";

  const inner = (
    <>
      <h2 className="text-lg font-semibold text-text-primary">
        Mieter-Kommunikation einrichten
      </h2>
      {!hardEnforced && daysLeft > 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Übergangsfrist: noch {daysLeft} Tag{daysLeft === 1 ? "" : "e"} bis zur
          verpflichtenden Einrichtung für alle Nutzer.
        </p>
      ) : null}
      {hardEnforced && !canComplete ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          Die Einrichtung ist noch nicht abgeschlossen. Bitte wenden Sie sich an einen
          Administrator Ihrer Organisation — ohne AV und Mieter-Kontakt ist das Portal
          gesperrt.
        </p>
      ) : (
        <p className="mt-2 text-sm text-text-secondary">
          Damit Mieter Sie bei Rückfragen erreichen können, hinterlegen Sie Kontaktdaten
          und bestätigen den AV-Vertrag (Version {ORG_AV_VERSION_CURRENT}).
        </p>
      )}

      {canComplete ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="portal-text-meta text-text-secondary" htmlFor="wl-tel">
              Telefon für Mieter
            </label>
            <input
              id="wl-tel"
              type="tel"
              className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
            />
          </div>
          <div>
            <label className="portal-text-meta text-text-secondary" htmlFor="wl-mail">
              E-Mail für Mieter
            </label>
            <input
              id="wl-mail"
              type="email"
              className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
          </div>
          <div>
            <label className="portal-text-meta text-text-secondary" htmlFor="wl-hint">
              Hinweis (optional)
            </label>
            <input
              id="wl-hint"
              type="text"
              placeholder="z. B. Mo–Fr 8–17 Uhr"
              className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>
          <div className="rounded-lg border border-border-default bg-surface-page p-3">
            <button
              type="button"
              className="text-sm font-medium text-text-primary underline"
              onClick={() => setAvExpanded((v) => !v)}
            >
              {avExpanded ? "AV-Text einklappen" : "AV-Text anzeigen (Entwurf)"}
            </button>
            {avExpanded ? (
              <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-text-secondary">
                {avText}
              </pre>
            ) : null}
          </div>
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={avOk}
              onChange={(e) => setAvOk(e.target.checked)}
              className="mt-1"
            />
            <span>
              Ich akzeptiere den Auftragsverarbeitungsvertrag (AV) gemäß Art. 28 DSGVO
              für die Mieter-Kommunikation über die Plattform.
            </span>
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {canComplete ? (
        <button type="submit" className="btn-pill-primary mt-5 w-full" disabled={busy}>
          {busy ? "Speichern…" : "Speichern und fortfahren"}
        </button>
      ) : (
        <form action="/portal/auth/signout" method="post" className="mt-5">
          <button type="submit" className="btn-pill-outline w-full">
            Abmelden
          </button>
        </form>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16201B]/50 p-4">
      {canComplete ? (
        <form onSubmit={save} className={panelClass}>
          {inner}
        </form>
      ) : (
        <div className={panelClass}>{inner}</div>
      )}
    </div>
  );
}
