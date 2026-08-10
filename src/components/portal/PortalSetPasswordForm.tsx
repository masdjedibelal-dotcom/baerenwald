"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalSetPasswordForm({
  loginHref = "/portal/login",
  forgotHref = "/portal/passwort-vergessen",
}: {
  loginHref?: string;
  forgotHref?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      router.push(`${loginHref}?hint=password-updated`);
      router.refresh();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PortalAuthBusy
        title="Passwort wird gespeichert…"
        body="Einen Moment — danach kannst du dich mit dem neuen Passwort anmelden."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="portal-form-label">Passwort wiederholen</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <button type="submit" className="btn-pill-primary w-full !py-2.5">
        Passwort speichern
      </button>
      <p className="portal-text-body text-center text-text-secondary">
        <Link href={forgotHref} className="text-accent hover:underline">
          Link erneut anfordern
        </Link>
      </p>
    </form>
  );
}
