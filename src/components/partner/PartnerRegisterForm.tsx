"use client";

import Link from "next/link";
import { useState } from "react";

import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { partnerAuthCallbackUrl } from "@/lib/partner/partner-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PartnerRegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const trimmedEmail = email.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: partnerAuthCallbackUrl(),
        data: { portal_role: "handwerker" },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    const identities = data.user?.identities ?? [];
    if (identities.length === 0) {
      setError("Diese E-Mail ist bereits registriert. Bitte melde dich an.");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-3 text-center portal-text-body text-text-secondary">
        <p>
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Nach der Bestätigung
          verknüpfen wir dein Konto mit deinem Partner-Profil — nur wenn deine
          E-Mail bei uns hinterlegt ist.
        </p>
        <PortalResendConfirmation defaultEmail={email} />
        <Link href="/partner/login" className="font-semibold text-accent hover:underline">
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-lg bg-muted/60 px-3 py-2 portal-text-meta text-text-secondary">
        Registrierung nur mit der E-Mail, die Bärenwald für dich als Partner
        hinterlegt hat. Sonst kontaktiere uns bitte vorher.
      </p>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="portal-form-label">
          Passwort (min. 8 Zeichen)
        </span>
        <input
          type="password"
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
        className="btn-pill-primary w-full !py-2.5 disabled:opacity-60"
      >
        {loading ? "Wird erstellt…" : "Konto anlegen"}
      </button>

      <p className="text-center portal-text-body text-text-secondary">
        Bereits registriert?{" "}
        <Link href="/partner/login" className="font-semibold text-accent hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
