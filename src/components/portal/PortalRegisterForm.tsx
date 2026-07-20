"use client";

import Link from "next/link";
import { useState } from "react";

import { assertPortalEmailAllowed } from "@/app/actions/assert-portal-email-allowed";
import { portalAuthCallbackUrl } from "@/lib/portal/portal-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalRegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [agb, setAgb] = useState(false);
  const [datenschutzError, setDatenschutzError] = useState(false);
  const [agbError, setAgbError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    if (!datenschutz) {
      setDatenschutzError(true);
      hasError = true;
    } else {
      setDatenschutzError(false);
    }
    if (!agb) {
      setAgbError(true);
      hasError = true;
    } else {
      setAgbError(false);
    }
    if (hasError) return;

    setLoading(true);
    setError(null);
    const trimmedEmail = email.trim();
    const allowed = await assertPortalEmailAllowed(trimmedEmail);
    if (!allowed.ok) {
      setLoading(false);
      setError(allowed.error);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();
    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: portalAuthCallbackUrl(),
        data: {
          name: name.trim(),
          telefon: telefon.trim() || null,
          datenschutz_akzeptiert_at: now,
          agb_akzeptiert_at: now,
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
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <p className="portal-text-section">Fast geschafft — bitte E-Mail bestätigen</p>
        <p className="portal-text-body leading-relaxed text-text-secondary">
          Wir haben dir eine Nachricht an <strong>{email.trim()}</strong> geschickt.
          Klicke auf den Bestätigungslink, danach kannst du dich anmelden.
        </p>
        <Link
          href="/portal/login"
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
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
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
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
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="portal-form-label">
          Telefon <span className="text-text-tertiary">(optional)</span>
        </span>
        <input
          type="tel"
          autoComplete="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="Für die Verknüpfung mit bestehenden Anfragen"
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="portal-form-label">
          Passwort <span className="text-text-tertiary">(mind. 8 Zeichen)</span>
        </span>
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

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-light bg-muted/20 p-3">
        <input
          type="checkbox"
          checked={datenschutz}
          onChange={(e) => {
            setDatenschutz(e.target.checked);
            if (e.target.checked) setDatenschutzError(false);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#2E7D52]"
        />
        <span className="portal-text-body text-text-primary">
          Ich habe die{" "}
          <a
            href="/datenschutz#meinbaerenwald"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Datenschutzerklärung
          </a>{" "}
          gelesen und stimme der Verarbeitung meiner Daten in MeinBärenwald zu.
        </span>
      </label>
      {datenschutzError ? (
        <p className="portal-text-body -mt-2 text-red-700">
          Bitte stimme der Datenschutzerklärung zu.
        </p>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-light bg-muted/20 p-3">
        <input
          type="checkbox"
          checked={agb}
          onChange={(e) => {
            setAgb(e.target.checked);
            if (e.target.checked) setAgbError(false);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#2E7D52]"
        />
        <span className="portal-text-body text-text-primary">
          Ich habe die{" "}
          <a
            href="/agb"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Allgemeinen Geschäftsbedingungen
          </a>{" "}
          gelesen und akzeptiere sie für die Nutzung des Kundenportals sowie für
          künftige Beauftragungen über Bärenwald.
        </span>
      </label>
      {agbError ? (
        <p className="portal-text-body -mt-2 text-red-700">Bitte akzeptiere die AGB.</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary portal-btn w-full !py-3 disabled:opacity-60"
      >
        {loading ? "Wird registriert…" : "Konto anlegen"}
      </button>

      <p className="border-t border-border-light pt-4 text-center portal-text-body text-text-secondary">
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
