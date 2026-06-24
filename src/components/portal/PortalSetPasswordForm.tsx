"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PortalSetPasswordFormProps = {
  homeHref?: string;
  loginHref?: string;
  forgotHref?: string;
  title?: string;
};

export function PortalSetPasswordForm({
  loginHref = "/portal/login",
  forgotHref = "/portal/passwort-vergessen",
  title = "Neues Passwort festlegen",
}: PortalSetPasswordFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    function applySession(userEmail: string | undefined) {
      if (cancelled) return;
      if (userEmail) setEmail(userEmail);
      setHasSession(Boolean(userEmail));
      setCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !session?.user.email) return;
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        applySession(session.user.email);
      }
    });

    async function initSession() {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setSessionError(
            "Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an."
          );
          setCheckingSession(false);
          return;
        }
        router.replace(pathname, { scroll: false });
      }

      const { data: first } = await supabase.auth.getSession();
      if (cancelled) return;
      if (first.session?.user.email) {
        applySession(first.session.user.email);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      const { data: second } = await supabase.auth.getSession();
      if (cancelled) return;
      if (second.session?.user.email) {
        applySession(second.session.user.email);
        return;
      }

      setSessionError(
        "Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an."
      );
      setCheckingSession(false);
    }

    void initSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, router, searchParams]);

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
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    router.push(`${loginHref}?hint=password-updated`);
    router.refresh();
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
          {sessionError ??
            "Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an."}
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="portal-text-section text-text-primary">{title}</h2>
      <p className="portal-text-body text-text-secondary">
        Wähle ein neues Passwort für dein Konto (mindestens 8 Zeichen).
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          autoComplete="username"
          className="portal-input w-full cursor-not-allowed rounded-xl border border-border-default bg-muted/50 px-3 py-3 text-text-secondary"
        />
      </label>

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
        <span className="portal-form-label">Passwort bestätigen</span>
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
