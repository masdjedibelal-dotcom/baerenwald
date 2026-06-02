"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
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
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-text-secondary">
        Zugang nur mit der bei Bärenwald hinterlegten Partner-E-Mail. Noch kein Konto?{" "}
        <Link href="/partner/registrieren" className="font-semibold text-accent hover:underline">
          Registrieren
        </Link>
      </p>
      {hint === "confirm" ? (
        <div className="space-y-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p>
            Bitte bestätige deine E-Mail über den Link in unserer Nachricht, danach
            kannst du dich anmelden.
          </p>
          <PortalResendConfirmation defaultEmail={email} className="text-left" />
        </div>
      ) : null}
      {authError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Anmeldung fehlgeschlagen. Bitte versuche es erneut.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-text-secondary">E-Mail</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-text-secondary">Passwort</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary w-full !py-2.5 !text-[14px] disabled:opacity-60"
      >
        {loading ? "Wird angemeldet…" : "Anmelden"}
      </button>

      <p className="text-center text-xs text-text-tertiary">
        <Link
          href="/partner/passwort-vergessen"
          className="text-accent underline-offset-2 hover:underline"
        >
          Passwort vergessen?
        </Link>
      </p>

      <p className="border-t border-border-light pt-4 text-center text-sm text-text-secondary">
        Zugang anfragen?{" "}
        <Link
          href="/partner/registrieren"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Registrieren
        </Link>
      </p>
    </form>
  );
}
