"use client";

import { useState } from "react";

import {
  confirmPortalSignupCode,
  resendPortalSignupCode,
} from "@/app/actions/portal-signup-otp";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import type { PortalOtpBrand } from "@/lib/funnel/funnel-portal-otp";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  brand?: PortalOtpBrand;
  /** Nach erfolgreicher Code-Prüfung (E-Mail bestätigt + Verknüpfung). */
  onVerified: () => void | Promise<void>;
  className?: string;
  /** Partner-Ton: „dein“ statt „Ihr“ */
  informal?: boolean;
};

/**
 * Gemeinsamer 4-stelliger E-Mail-OTP-Schritt nach Registrierung
 * (MeinBärenwald, Partner, Einladung).
 */
export function PortalSignupOtpStep({
  email,
  brand = "meinbaerenwald",
  onVerified,
  className,
  informal = false,
}: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmPortalSignupCode({ email, code, brand });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    try {
      await onVerified();
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error
          ? err.message
          : "Bestätigung ok — Anmeldung fehlgeschlagen."
      );
      return;
    }
    setBusy(false);
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    setResent(false);
    const result = await resendPortalSignupCode(email, brand);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResent(true);
  }

  if (busy) {
    return (
      <PortalAuthBusy
        title="Code wird geprüft…"
        body={
          informal
            ? "Einen Moment — wir bestätigen dein Konto."
            : "Einen Moment — wir bestätigen Ihr Konto."
        }
      />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={cn("space-y-4", className)}>
      <div className="space-y-1 text-center">
        <p className="portal-text-section">Code aus der E-Mail eingeben</p>
        <p className="portal-text-body text-text-secondary">
          Wir haben einen 4-stelligen Code an{" "}
          <strong className="text-text-primary">{email.trim()}</strong> geschickt.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">
          {error}
        </p>
      ) : null}
      {resent ? (
        <p className="portal-text-body text-emerald-800 text-center">
          Neuer Code wurde gesendet.
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">Bestätigungscode</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={4}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 text-center text-lg font-semibold tracking-[0.35em] focus:border-accent"
          placeholder="••••"
        />
      </label>

      <button
        type="submit"
        disabled={code.length !== 4}
        className="btn-pill-primary portal-btn w-full disabled:opacity-60"
      >
        Code bestätigen
      </button>

      <button
        type="button"
        onClick={() => void onResend()}
        className="w-full text-center portal-text-body font-medium text-accent underline-offset-2 hover:underline"
      >
        Code erneut senden
      </button>
    </form>
  );
}
