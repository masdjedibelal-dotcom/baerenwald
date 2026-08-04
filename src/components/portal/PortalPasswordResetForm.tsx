"use client";

import { useState } from "react";

import {
  AuthBtn,
  AuthInput,
  AuthLabel,
  AuthLink,
} from "@/components/portal/auth/AuthPrimitives";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalAuthConfirm } from "@/components/portal/auth/PortalAuthConfirm";
import { AUTH_CONFIRM, AUTH_FORGOT, AUTH_LOGIN } from "@/lib/portal2/auth";
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

  if (loading) {
    return (
      <PortalAuthBusy
        title="Link wird gesendet…"
        body="Einen Moment — wir bereiten den Zurücksetzen-Link vor."
      />
    );
  }

  if (sent) {
    return (
      <PortalAuthConfirm
        icon={AUTH_CONFIRM.forgotSent.icon}
        title={AUTH_CONFIRM.forgotSent.title}
        body={AUTH_CONFIRM.forgotSent.body}
        actionLabel={AUTH_CONFIRM.forgotSent.action}
        onAction={() => {
          setSent(false);
        }}
        footer={
          <AuthLink href="/portal/login">‹ Zurück zum Login</AuthLink>
        }
      />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div>
        <AuthLabel>{AUTH_LOGIN.emailLabel}</AuthLabel>
        <AuthInput
          type="email"
          required
          placeholder={AUTH_LOGIN.emailPh}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mt-2 h-2" />
      <AuthBtn type="submit">{AUTH_FORGOT.submit}</AuthBtn>
      <p className="mt-5 text-center text-[13px] text-text-secondary">
        <AuthLink href="/portal/login">{AUTH_FORGOT.back}</AuthLink>
      </p>
    </form>
  );
}
