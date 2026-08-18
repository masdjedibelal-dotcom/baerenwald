"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { assertPartnerEmailAllowed } from "@/app/actions/assert-partner-email-allowed";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalSignupOtpStep } from "@/components/portal/PortalSignupOtpStep";
import { StagingAuthHint } from "@/components/portal/auth/StagingAuthHint";
import { PartnerAuthFlowHint } from "@/components/partner/PartnerAuthFlowHint";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PartnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hint = searchParams.get("hint");
  const authError = searchParams.get("error");
  const next = searchParams.get("next") || "/partner";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpConfirmed, setOtpConfirmed] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const allowed = await assertPartnerEmailAllowed(email.trim());
      if (!allowed.ok) {
        setError(allowed.error);
        setLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setAwaitingOtp(true);
          setLoading(false);
          return;
        } else if (msg.includes("banned") || msg.includes("user is banned")) {
          setError(PARTNER_AUTH_COPY.errors.portalGesperrt);
        } else {
          setError("E-Mail oder Passwort ist ungültig.");
        }
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PortalAuthBusy
        title="Anmeldung läuft…"
        body="Einen Moment — wir melden dich an und öffnen das Partner-Portal."
      />
    );
  }

  if (awaitingOtp || (hint === "confirm" && !otpConfirmed)) {
    return (
      <div className="space-y-4">
        <PortalSignupOtpStep
          email={email.trim()}
          brand="partner"
          informal
          onVerified={async () => {
            if (password.length >= 8) {
              const supabase = getSupabaseBrowserClient();
              const { error: signErr } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
              });
              if (signErr) {
                setAwaitingOtp(false);
                setOtpConfirmed(true);
                throw new Error(
                  "Konto bestätigt — bitte erneut mit Passwort anmelden."
                );
              }
              router.replace(next);
              router.refresh();
              return;
            }
            setAwaitingOtp(false);
            setOtpConfirmed(true);
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <StagingAuthHint variant="partner" />
      <PartnerAuthFlowHint variant="login" />
      {otpConfirmed ? (
        <p className="rounded-lg bg-accent-light/60 px-3 py-3 portal-text-body text-accent">
          E-Mail bestätigt. Du kannst dich jetzt anmelden.
        </p>
      ) : null}
      {hint === "password-updated" ? (
        <p className="rounded-lg bg-accent-light/60 px-3 py-3 portal-text-body text-accent">
          Dein Passwort wurde gespeichert. Du kannst dich jetzt anmelden.
        </p>
      ) : null}
      {hint === "crm_enter_invalid" ? (
        <p className="rounded-lg bg-red-50 px-3 py-3 portal-text-body text-red-800">
          Der CRM-Portal-Link ist ungültig oder abgelaufen. Bitte im CRM erneut
          „Login“ klicken. Lokal muss PARTNER_INTERNAL_API_SECRET in CRM und
          Portal identisch sein.
        </p>
      ) : null}
      {hint === "crm_enter_failed" ? (
        <p className="rounded-lg bg-red-50 px-3 py-3 portal-text-body text-red-800">
          Automatische Anmeldung aus dem CRM ist fehlgeschlagen
          {searchParams.get("msg")
            ? `: ${decodeURIComponent(searchParams.get("msg") || "")}`
            : "."}{" "}
          Bitte erneut versuchen oder manuell anmelden.
        </p>
      ) : null}
      {hint === "session_mismatch" ? (
        <p className="rounded-lg bg-amber-50 px-3 py-3 portal-text-body text-amber-900">
          Die Sitzung passt nicht zu einem Partner-Konto. Bitte mit der im CRM
          hinterlegten Betriebs-E-Mail anmelden.
        </p>
      ) : null}
      {authError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">
          Anmeldung fehlgeschlagen. Bitte versuche es erneut.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-field w-full"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="portal-form-label">Passwort</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="portal-field w-full"
        />
      </label>

      <button type="submit" className="btn-pill-primary portal-btn w-full">
        Anmelden
      </button>

      <p className="portal-text-meta text-center text-text-tertiary">
        <Link
          href="/partner/passwort-vergessen"
          className="text-accent underline-offset-2 hover:underline"
        >
          Passwort vergessen?
        </Link>
      </p>

      <p className="border-t border-border-light pt-4 text-center portal-text-body text-text-secondary">
        Noch kein Konto?{" "}
        <Link
          href="/partner/registrieren"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Jetzt registrieren
        </Link>
        <span className="block mt-1 portal-text-meta text-text-tertiary">
          Nur möglich, nachdem Bärenwald deinen Betrieb angelegt hat.
        </span>
      </p>
    </form>
  );
}
