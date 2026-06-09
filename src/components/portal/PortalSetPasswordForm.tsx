"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PortalSetPasswordFormProps = {
  homeHref?: string;
  loginHref?: string;
  forgotHref?: string;
  title?: string;
};

export function PortalSetPasswordForm({
  homeHref = "/portal",
  loginHref = "/portal/login",
  forgotHref = "/portal/passwort-vergessen",
  title = "Neues Passwort festlegen",
}: PortalSetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setHasSession(Boolean(data.session));
          setCheckingSession(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
  }

  if (checkingSession) {
    return (
      <p className="portal-text-body text-center text-text-secondary">Wird geladen…</p>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-4 text-center">
        <p className="portal-text-body text-text-secondary">
          Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an.
        </p>
        <Link
          href={forgotHref}
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
          Neuen Link anfordern
        </Link>
        <p className="portal-text-body">
          <Link href={loginHref} className="font-semibold text-accent hover:underline">
            Zurück zum Login
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="portal-text-section">{title} — erledigt</p>
        <p className="portal-text-body text-text-secondary">
          Dein Passwort wurde gespeichert. Du kannst dich ab sofort damit anmelden.
        </p>
        <Link
          href={homeHref}
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
          Weiter zu MeinBärenwald
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="portal-text-body text-text-secondary">
        Wähle ein neues Passwort für dein Konto (mindestens 8 Zeichen).
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">Neues Passwort</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="portal-form-label">Passwort wiederholen</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary portal-btn w-full !py-3 disabled:opacity-60"
      >
        {loading ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}
