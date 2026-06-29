"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { portalAuthCallbackUrl } from "@/lib/portal/portal-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/portal";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datenschutz) {
      setError("Bitte akzeptiere die Datenschutzerklärung.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: portalAuthCallbackUrl(next),
        data: { name: name.trim() || undefined },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="space-y-3 portal-text-body text-text-secondary">
        <p>
          Fast geschafft — wir haben dir einen Bestätigungslink geschickt. Nach
          der Bestätigung kannst du dich anmelden.
        </p>
        <Link href="/portal/login" className="btn-pill-primary inline-block w-full text-center !py-2.5">
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">Name</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="portal-form-label">Passwort</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>

      <label className="flex items-start gap-2.5 portal-text-body text-text-secondary">
        <input
          type="checkbox"
          checked={datenschutz}
          onChange={(e) => setDatenschutz(e.target.checked)}
          className="mt-1"
        />
        <span>
          Ich habe die{" "}
          <Link href="/datenschutz" className="text-accent underline-offset-2 hover:underline">
            Datenschutzerklärung
          </Link>{" "}
          gelesen.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary w-full !py-2.5 disabled:opacity-60"
      >
        {loading ? "Wird angelegt…" : "Konto anlegen"}
      </button>

      <p className="portal-text-body text-center text-text-secondary">
        Bereits registriert?{" "}
        <Link href="/portal/login" className="font-semibold text-accent hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
