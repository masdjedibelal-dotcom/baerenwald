"use client";

import { useState } from "react";

import { resendPortalSignupCode } from "@/app/actions/portal-signup-otp";
import type { PortalOtpBrand } from "@/lib/funnel/funnel-portal-otp";
import { cn } from "@/lib/utils";

export function PortalResendConfirmation({
  defaultEmail = "",
  brand = "meinbaerenwald",
  className,
}: {
  defaultEmail?: string;
  brand?: PortalOtpBrand;
  className?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Bitte geben Sie Ihre E-Mail ein.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await resendPortalSignupCode(trimmed, brand);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className={cn("portal-text-body text-emerald-800", className)}>
        Neuer Bestätigungscode wurde gesendet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block space-y-1">
        <span className="portal-form-label">E-Mail für neuen Code</span>
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
        onClick={() => void resend()}
        className="btn-pill-outline w-full !py-2.5 disabled:opacity-60"
      >
        {loading ? "Wird gesendet…" : "Code erneut senden"}
      </button>
    </div>
  );
}
