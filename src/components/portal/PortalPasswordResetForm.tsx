"use client";

import Link from "next/link";
import { useState } from "react";

import { portalPasswordResetCallbackUrl } from "@/lib/portal/portal-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: portalPasswordResetCallbackUrl() }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center portal-text-body text-text-secondary">
        <p>
          Wenn ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum
          Zurücksetzen geschickt.
        </p>
        <Link href="/portal/login" className="font-semibold text-accent hover:underline">
          Zurück zum Login
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
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="btn-pill-primary portal-btn w-full !py-3 disabled:opacity-60"
      >
        {loading ? "Wird gesendet…" : "Link senden"}
      </button>
      <p className="portal-text-body text-center">
        <Link href="/portal/login" className="text-accent hover:underline">
          Zurück zum Login
        </Link>
      </p>
    </form>
  );
}
