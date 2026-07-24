"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { assertPartnerEmailAllowed } from "@/app/actions/assert-partner-email-allowed";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
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
          setError(
            "Bitte bestätige zuerst deine E-Mail — wir haben dir einen Link geschickt."
          );
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PartnerAuthFlowHint variant="login" />
      {hint === "confirm" ? (
        <div className="space-y-3 rounded-lg bg-amber-50 px-3 py-3 portal-text-body text-amber-900">
          <p>
            Bitte bestätige deine E-Mail über den Link in unserer Nachricht, danach
            kannst du dich anmelden.
          </p>
          <PortalResendConfirmation defaultEmail={email} className="text-left" />
        </div>
      ) : null}
      {hint === "password-updated" ? (
        <p className="rounded-lg bg-accent-light/60 px-3 py-3 portal-text-body text-accent">
          Dein Passwort wurde gespeichert. Du kannst dich jetzt anmelden.
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
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
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
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <button type="submit" className="btn-pill-primary portal-btn w-full !py-3">
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
