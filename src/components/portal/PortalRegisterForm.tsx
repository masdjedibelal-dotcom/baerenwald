"use client";

import Link from "next/link";
import { useState } from "react";

import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { portalAuthCallbackUrl } from "@/lib/portal/portal-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalRegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

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
        emailRedirectTo: portalAuthCallbackUrl(),
        data: {
          name: name.trim(),
          telefon: telefon.trim() || null,
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setError("Diese E-Mail ist bereits registriert. Bitte melde dich an.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // Supabase gibt bei bestehender E-Mail oft trotzdem „Erfolg“ (Enumeration-Schutz),
    // sendet aber keine neue Mail — identities ist dann leer.
    const identities = data.user?.identities ?? [];
    if (identities.length === 0) {
      setAlreadyRegistered(true);
      setRegisteredEmail(trimmedEmail);
      setSuccess(true);
      return;
    }

    setAlreadyRegistered(false);
    setRegisteredEmail(trimmedEmail);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-text-primary">
          {alreadyRegistered
            ? "E-Mail prüfen oder anmelden"
            : "Fast geschafft — bitte E-Mail bestätigen"}
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {alreadyRegistered ? (
            <>
              Unter <strong>{registeredEmail}</strong> existiert vermutlich schon ein Konto.
              Prüfe dein Postfach (auch Spam) oder sende die Bestätigung erneut.
            </>
          ) : (
            <>
              Wir haben dir eine Nachricht an <strong>{registeredEmail}</strong> geschickt.
              Klicke auf den Bestätigungslink, danach kannst du dich anmelden.
            </>
          )}
        </p>
        <PortalResendConfirmation
          defaultEmail={registeredEmail}
          className="rounded-xl border border-border-light bg-surface-muted/40 p-3 text-left"
        />
        <Link
          href="/portal/login"
          className="btn-pill-primary inline-flex !px-4 !py-2 !text-[13px]"
        >
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-text-secondary">Name</span>
        <input
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

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
        <span className="text-xs font-medium text-text-secondary">
          Telefon <span className="text-text-tertiary">(optional)</span>
        </span>
        <input
          type="tel"
          autoComplete="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="Für die Verknüpfung mit bestehenden Anfragen"
          className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-text-secondary">
          Passwort <span className="text-text-tertiary">(mind. 8 Zeichen)</span>
        </span>
        <input
          type="password"
          autoComplete="new-password"
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
        {loading ? "Wird registriert…" : "Konto anlegen"}
      </button>

      <p className="border-t border-border-light pt-4 text-center text-sm text-text-secondary">
        Bereits registriert?{" "}
        <Link
          href="/portal/login"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Anmelden
        </Link>
      </p>
    </form>
  );
}
