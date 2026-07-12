"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function parseHashSession(): { access_token?: string; refresh_token?: string } {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hint = searchParams.get("hint");
  const authError = searchParams.get("error");
  const next = searchParams.get("next") || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashBusy, setHashBusy] = useState(true);

  useEffect(() => {
    const { access_token, refresh_token } = parseHashSession();
    if (!access_token || !refresh_token) {
      setHashBusy(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("Anmeldung über Link fehlgeschlagen.");
          setHashBusy(false);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        router.replace(next);
        router.refresh();
      });
  }, [next, router]);

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
      {hashBusy ? (
        <p className="rounded-lg bg-accent-light/60 px-3 py-3 portal-text-body text-accent">
          Anmeldung wird abgeschlossen…
        </p>
      ) : null}
      {hint === "signed_out" ? (
        <p className="rounded-lg bg-accent-light/60 px-3 py-3 portal-text-body text-accent">
          Du bist abgemeldet.
        </p>
      ) : null}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary w-full !py-2.5 disabled:opacity-60"
      >
        {loading ? "Anmelden…" : "Anmelden"}
      </button>

      <p className="portal-text-body text-center text-text-secondary">
        <Link href="/portal/passwort-vergessen" className="text-accent hover:underline">
          Passwort vergessen?
        </Link>
      </p>
      <p className="portal-text-body text-center text-text-secondary">
        Noch kein Konto?{" "}
        <Link href="/portal/registrieren" className="font-semibold text-accent hover:underline">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
