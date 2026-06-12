"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hint = searchParams.get("hint");
  const authError = searchParams.get("error");
  const authMsg = searchParams.get("msg");
  const next = searchParams.get("next") || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(hint === "confirm");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setShowResend(true);
        setError(
          "Bitte bestätige zuerst deine E-Mail — wir haben dir einen Link geschickt."
        );
        return;
      }
      setError("E-Mail oder Passwort ist ungültig.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hint === "confirm" ? (
        <div className="space-y-3 rounded-lg bg-amber-50 px-3 py-3 portal-text-body text-amber-900">
          <p>
            Bitte bestätige deine E-Mail-Adresse über den Link in unserer Nachricht,
            danach kannst du dich anmelden. Keine Mail? Spam prüfen oder erneut anfordern.
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
          {authMsg ?? "Anmeldung fehlgeschlagen. Bitte versuche es erneut."}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}
      {showResend && hint !== "confirm" ? (
        <PortalResendConfirmation
          defaultEmail={email}
          className="rounded-lg border border-border-light bg-surface-muted/40 p-3"
        />
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

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary portal-btn w-full !py-3 disabled:opacity-60"
      >
        {loading ? "Wird angemeldet…" : "Anmelden"}
      </button>

      <p className="portal-text-meta text-center text-text-tertiary">
        <Link
          href="/portal/passwort-vergessen"
          className="text-accent underline-offset-2 hover:underline"
        >
          Passwort vergessen?
        </Link>
      </p>

      <p className="border-t border-border-light pt-4 text-center portal-text-body text-text-secondary">
        Noch kein Konto?{" "}
        <Link
          href="/portal/registrieren"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Registrieren
        </Link>
      </p>
    </form>
  );
}
