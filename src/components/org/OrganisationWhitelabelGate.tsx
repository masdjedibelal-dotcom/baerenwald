"use client";

import { useEffect, useState } from "react";

import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
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
import {
  lockPortalBodyScroll,
  unlockPortalBodyScroll,
} from "@/lib/portal2/lock-portal-body-scroll";
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
  const [avOpen, setAvOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { runBusy } = usePortalBusy();

  const ready = orgWhitelabelReady(kunde);

  useEffect(() => {
    if (ready) return;
    lockPortalBodyScroll();
    return () => unlockPortalBodyScroll();
  }, [ready]);

  if (ready) return null;

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
      await runBusy(async () => {
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
      });
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
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={avOk}
              onChange={(e) => setAvOk(e.target.checked)}
              className="mt-1"
            />
            <span>
              Ich akzeptiere den{" "}
              <button
                type="button"
                className="font-medium text-accent underline-offset-2 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAvOpen(true);
                }}
              >
                Auftragsverarbeitungsvertrag
              </button>{" "}
              (AV) gemäß Art. 28 DSGVO für die Mieter-Kommunikation über die Plattform.
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
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16201B]/50 p-4 overscroll-none touch-none"
        role="presentation"
        onWheel={(e) => {
          if (e.target === e.currentTarget) e.preventDefault();
        }}
        onTouchMove={(e) => {
          if (e.target === e.currentTarget) e.preventDefault();
        }}
      >
        {canComplete ? (
          <form
            onSubmit={save}
            className={`${panelClass} relative touch-auto overscroll-contain`}
            onClick={(e) => e.stopPropagation()}
          >
            {busy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/80">
                <PortalContentBusy
                  title="Wird gespeichert…"
                  body="Einen Moment bitte."
                  className="!min-h-0 !py-8"
                />
              </div>
            ) : null}
            {inner}
          </form>
        ) : (
          <div
            className={`${panelClass} touch-auto overscroll-contain`}
            onClick={(e) => e.stopPropagation()}
          >
            {inner}
          </div>
        )}
      </div>

      <PortalModalShell
        open={avOpen}
        onClose={() => setAvOpen(false)}
        title="Auftragsverarbeitungsvertrag"
        subtitle={`Version ${ORG_AV_VERSION_CURRENT}`}
        variant="preview"
        closeOnBackdrop
      >
        <pre className="max-h-[min(60vh,28rem)] overflow-y-auto whitespace-pre-wrap font-sans portal-text-body text-text-primary">
          {avText}
        </pre>
      </PortalModalShell>
    </>
  );
}
