"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import {
  getFunnelSessionContactPrefill,
  registerFunnelPortalAccount,
  resendFunnelPortalCode,
  verifyFunnelPortalCode,
} from "@/app/actions/funnel-portal-auth";
import type { PortalContactPrefill } from "@/lib/portal/portal-contact-prefill";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type FunnelAuthCompletePayload = {
  prefill: PortalContactPrefill;
  /** true = Stammdaten reichen → Kontaktformular überspringen */
  skipContact: boolean;
};

type AuthTab = "login" | "register";
type Phase = "boot" | "auth" | "verify";

const MEIN_BAERENWALD_VORTEILE = [
  "Preisrahmen berechnen und Angebot speichern",
  "Vorgang jederzeit in Mein Bärenwald nachverfolgen",
  "Angebote annehmen und Termine koordinieren",
] as const;

function isContactComplete(p: PortalContactPrefill): boolean {
  return Boolean(
    p.vorname?.trim() &&
      p.nachname?.trim() &&
      p.email?.trim() &&
      p.strasse?.trim() &&
      p.hausnummer?.trim() &&
      /^\d{5}$/.test(p.plz?.trim() ?? "") &&
      p.ort?.trim()
  );
}

export interface FunnelPortalAuthGateProps {
  /** PLZ aus dem Ort-Schritt als Prefill für Registrierung */
  initialPlz?: string;
  onAuthenticated: (payload: FunnelAuthCompletePayload) => void;
  className?: string;
}

export function FunnelPortalAuthGate({
  initialPlz = "",
  onAuthenticated,
  className,
}: FunnelPortalAuthGateProps) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [telefon, setTelefon] = useState("");
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState(initialPlz);
  const [ort, setOrt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getFunnelSessionContactPrefill();
      if (cancelled) return;
      if (session.ok && session.authenticated) {
        onAuthenticated({
          prefill: session.prefill,
          skipContact: isContactComplete(session.prefill),
        });
        return;
      }
      setPhase("auth");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur einmal beim Mount
  }, []);

  async function finishWithPrefill(prefill: PortalContactPrefill) {
    onAuthenticated({
      prefill,
      skipContact: isContactComplete(prefill),
    });
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    setError(null);
    setPassword("");
    setPassword2("");
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signErr) {
      setBusy(false);
      setError(
        signErr.message.toLowerCase().includes("invalid")
          ? "E-Mail oder Passwort ungültig."
          : signErr.message
      );
      return;
    }
    const session = await getFunnelSessionContactPrefill();
    setBusy(false);
    if (!session.ok) {
      setError(session.error);
      return;
    }
    if (!session.authenticated) {
      setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    await finishWithPrefill(session.prefill);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (password !== password2) {
      setBusy(false);
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    const result = await registerFunnelPortalAccount({
      vorname,
      nachname,
      email,
      telefon,
      strasse,
      hausnummer,
      plz,
      ort,
      password,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      if (result.error.toLowerCase().includes("bereits registriert")) {
        setTab("login");
      }
      return;
    }
    setCode("");
    setPhase("verify");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const verified = await verifyFunnelPortalCode({ email, code });
    if (!verified.ok) {
      setBusy(false);
      setError(verified.error);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signErr) {
      setError(
        "Konto bestätigt — Anmeldung fehlgeschlagen. Bitte mit Passwort erneut anmelden."
      );
      setPhase("auth");
      setTab("login");
      return;
    }
    await finishWithPrefill(verified.prefill);
  }

  async function onResendCode() {
    setBusy(true);
    setError(null);
    const result = await resendFunnelPortalCode(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
  }

  if (phase === "boot") {
    return (
      <div className={cn("py-8 text-center text-sm text-text-secondary", className)}>
        Anmeldung wird geprüft…
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-text-secondary">
          Melde dich bei <strong className="text-text-primary">Mein Bärenwald</strong>{" "}
          an, um deinen Preis zu berechnen und das Angebot zu versenden.
        </p>
        <ul className="space-y-2 pt-1">
          {MEIN_BAERENWALD_VORTEILE.map((text) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-text-primary">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-funnel-accent/15 text-funnel-accent"
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {phase === "auth" ? (
        <>
          <div
            className="grid grid-cols-2 gap-1 rounded-full border border-border-default bg-surface-muted p-1"
            role="tablist"
            aria-label="Anmelden oder registrieren"
          >
            {(
              [
                { id: "login", label: "Login" },
                { id: "register", label: "Registrierung" },
              ] as const
            ).map((item) => {
              const on = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => switchTab(item.id)}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                    on
                      ? "bg-funnel-accent text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab === "login" ? (
            <form onSubmit={onLogin} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                className="funnel-input"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                className="funnel-input"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy || !email.trim() || password.length < 8}
                className="w-full rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {busy ? "Anmelden…" : "Anmelden →"}
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  className="funnel-input"
                  placeholder="Vorname"
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                />
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  className="funnel-input"
                  placeholder="Nachname"
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                />
              </div>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                className="funnel-input"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="tel"
                autoComplete="tel"
                className="funnel-input"
                placeholder="Telefon (optional)"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
              />
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <input
                  type="text"
                  autoComplete="address-line1"
                  required
                  className="funnel-input"
                  placeholder="Straße"
                  value={strasse}
                  onChange={(e) => setStrasse(e.target.value)}
                />
                <input
                  type="text"
                  required
                  className="funnel-input"
                  placeholder="Nr."
                  value={hausnummer}
                  onChange={(e) => setHausnummer(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  required
                  className="funnel-input"
                  placeholder="PLZ"
                  value={plz}
                  onChange={(e) =>
                    setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                />
                <input
                  type="text"
                  autoComplete="address-level2"
                  required
                  className="funnel-input"
                  placeholder="Ort"
                  value={ort}
                  onChange={(e) => setOrt(e.target.value)}
                />
              </div>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="funnel-input"
                placeholder="Passwort (mind. 8 Zeichen)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="funnel-input"
                placeholder="Passwort wiederholen"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {busy ? "Konto wird angelegt…" : "Registrieren →"}
              </button>
            </form>
          )}
        </>
      ) : null}

      {phase === "verify" ? (
        <form onSubmit={onVerify} className="space-y-3">
          <p className="text-sm text-text-primary">
            Wir haben einen 4-stelligen Code an <strong>{email}</strong>{" "}
            gesendet.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={4}
            className="funnel-input tracking-[0.35em] text-center text-lg font-semibold"
            placeholder="••••"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
          <button
            type="submit"
            disabled={busy || code.length !== 4}
            className="w-full rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {busy ? "Prüfen…" : "Code bestätigen →"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full text-center text-sm text-funnel-accent underline disabled:opacity-40"
            onClick={() => void onResendCode()}
          >
            Code erneut senden
          </button>
          <button
            type="button"
            className="w-full text-center text-sm text-text-secondary underline"
            onClick={() => {
              setPhase("auth");
              setTab("login");
              setError(null);
            }}
          >
            Zurück zum Login
          </button>
        </form>
      ) : null}
    </div>
  );
}
