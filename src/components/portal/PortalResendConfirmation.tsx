"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function PortalResendConfirmation({
  defaultEmail = "",
  className,
}: {
  defaultEmail?: string;
  className?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Bitte gib deine E-Mail ein.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
    });
    setLoading(false);
    if (resendError) {
      setError("Link konnte nicht gesendet werden. Bitte später erneut versuchen.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className={cn("portal-text-body text-emerald-800", className)}>
        Bestätigungslink wurde erneut gesendet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block space-y-1">
        <span className="portal-form-label">E-Mail für erneuten Link</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5"
        />
      </label>
      {error ? (
        <p className="portal-text-meta text-red-700">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={resend}
        className="btn-pill-outline w-full !py-2.5 disabled:opacity-60"
      >
        {loading ? "Wird gesendet…" : "Bestätigungslink erneut senden"}
      </button>
    </div>
  );
}
