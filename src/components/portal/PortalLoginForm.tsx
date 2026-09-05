"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AuthBtn,
  AuthInput,
  AuthLabel,
  AuthLink,
} from "@/components/portal/auth/AuthPrimitives";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { assertPortalEmailAllowed } from "@/app/actions/assert-portal-email-allowed";
import { AUTH_LOGIN, type AuthPortalRole } from "@/lib/portal2/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function parseHashSession(): { access_token?: string; refresh_token?: string } {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

type Props = {
  role?: AuthPortalRole;
  orgName?: string | null;
  registerHref?: string;
  forgotHref?: string;
};

/**
 * Portal-Login — nur E-Mail + Passwort (kein Magic-Link).
 */
export function PortalLoginForm({
  registerHref = "/portal/registrieren",
  forgotHref = "/portal/passwort-vergessen",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hint = searchParams.get("hint");
  const authError = searchParams.get("error");
  const next = searchParams.get("next") || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashBusy, setHashBusy] = useState(true);

  useEffect(() => {
    const prefillEmail = searchParams.get("email")?.trim();
    if (prefillEmail) setEmail(prefillEmail);
  }, [searchParams]);

  useEffect(() => {
    const { access_token, refresh_token } = parseHashSession();
    if (!access_token || !refresh_token) {
      setHashBusy(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("Anmeldung über Link fehlgeschlagen.");
          setHashBusy(false);
          return;
        }
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
        router.replace(next);
        router.refresh();
      });
  }, [next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const allowed = await assertPortalEmailAllowed(email.trim());
      if (!allowed.ok) {
        setError(allowed.error);
        setLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError(
            "Bitte bestätigen Sie zuerst Ihre E-Mail — wir haben Ihnen einen Link geschickt."
          );
        } else if (msg.includes("banned") || msg.includes("user is banned")) {
          setError(
            "Diese Kontaktadresse ist gesperrt. Bitte wende dich an uns, wenn du Hilfe brauchst."
          );
        } else {
          setError("E-Mail oder Passwort ist ungültig.");
        }
        setLoading(false);
        return;
      }
      // Loading bleibt an bis Redirect — sonst wirkt die Seite „hängend“
      router.push(next);
      router.refresh();
    } catch {
      setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PortalAuthBusy
        title="Anmeldung läuft…"
        body="Einen Moment — wir melden Sie an und öffnen Ihr Portal."
      />
    );
  }

  if (hashBusy) {
    return (
      <PortalAuthBusy
        title="Anmeldung wird abgeschlossen…"
        body="Sitzung wird eingerichtet. Bitte kurz warten."
      />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-0">
      {hint === "signed_out" ? (
        <p className="mb-4 rounded-lg bg-accent-light/60 px-3 py-3 text-sm text-accent">
          Sie sind abgemeldet.
        </p>
      ) : null}
      {hint === "confirm" ? (
        <div className="mb-4 space-y-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p>
            Bitte bestätigen Sie Ihre E-Mail über den Link in unserer Nachricht,
            danach können Sie sich anmelden.
          </p>
          <PortalResendConfirmation defaultEmail={email} className="text-left" />
        </div>
      ) : null}
      {hint === "password-updated" ? (
        <p className="mb-4 rounded-lg bg-accent-light/60 px-3 py-3 text-sm text-accent">
          Ihr Passwort wurde gespeichert. Sie können sich jetzt anmelden.
        </p>
      ) : null}
      {authError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div>
        <AuthLabel>{AUTH_LOGIN.emailLabel}</AuthLabel>
        <AuthInput
          type="email"
          autoComplete="email"
          required
          placeholder={AUTH_LOGIN.emailPh}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <AuthLabel>{AUTH_LOGIN.passwordLabel}</AuthLabel>
          <AuthLink href={forgotHref}>{AUTH_LOGIN.forgot}</AuthLink>
        </div>
        <AuthInput
          type="password"
          autoComplete="current-password"
          required
          placeholder={AUTH_LOGIN.passwordPh}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <AuthBtn type="submit" className="!mt-[18px]">
        {AUTH_LOGIN.submit}
      </AuthBtn>

      <p className="mt-[22px] text-center text-[13px] text-text-secondary">
        {AUTH_LOGIN.neu}{" "}
        <Link href={registerHref} className="font-semibold text-accent hover:underline">
          {AUTH_LOGIN.zugang}
        </Link>
      </p>
    </form>
  );
}
