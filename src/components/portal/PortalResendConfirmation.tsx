"use client";

import { useState } from "react";

import { portalAuthCallbackUrl } from "@/lib/portal/portal-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  /** Vorausgefüllte E-Mail (z. B. von Login-Formular) */
  defaultEmail?: string;
  className?: string;
};

export function PortalResendConfirmation({ defaultEmail = "", className }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: { emailRedirectTo: portalAuthCallbackUrl() },
    });

    setLoading(false);

    if (resendError) {
      const msg = resendError.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setError(
          "Zu viele Versuche — bitte in ein paar Minuten erneut versuchen oder uns anrufen."
        );
      } else {
        setError(resendError.message);
      }
      return;
    }

    setMessage(
      "Wenn ein unbestätigtes Konto mit dieser E-Mail existiert, haben wir dir einen neuen Link geschickt. Bitte auch den Spam-Ordner prüfen."
    );
  }

  return (
    <form onSubmit={onResend} className={className ?? "space-y-2"}>
      <p className="text-xs font-medium text-text-secondary">
        Bestätigungsmail erneut senden
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.de"
          className="min-w-0 flex-1 rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted disabled:opacity-60"
        >
          {loading ? "Sende…" : "Erneut senden"}
        </button>
      </div>
      {message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-900">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
      ) : null}
    </form>
  );
}
