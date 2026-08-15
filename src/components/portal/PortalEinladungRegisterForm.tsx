"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { registerMeinBaerenwaldWithOtp } from "@/app/actions/portal-signup-otp";
import {
  MieterWlBtn,
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalSignupOtpStep } from "@/components/portal/PortalSignupOtpStep";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  token: string;
  brand: MieterWlBrand;
  objektTitel: string;
  einheitLabel: string | null;
  canRegister: boolean;
  statusHint: string;
};

/**
 * E4 — Konto anlegen im HV-Branding; Bestätigung per E-Mail-OTP, dann Einlösung.
 */
export function PortalEinladungRegisterForm({
  token,
  brand,
  objektTitel,
  einheitLabel,
  canRegister,
  statusHint,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [agb, setAgb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  async function redeemIfLoggedIn() {
    const res = await fetch(
      `/api/portal/einladung/${encodeURIComponent(token)}`,
      { method: "POST" }
    );
    const json = (await res.json()) as {
      error?: string;
      redirectTo?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Einlösung fehlgeschlagen");
    router.replace(json.redirectTo || "/portal");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRegister) return;
    if (!datenschutz || !agb) {
      setError("Bitte Datenschutz und AGB akzeptieren.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await registerMeinBaerenwaldWithOtp({
      name,
      email,
      telefon,
      password,
      einladungToken: token,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAwaitingOtp(true);
  }

  async function afterOtpVerified() {
    const supabase = getSupabaseBrowserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signErr) {
      throw new Error(
        "Konto bestätigt — bitte anmelden und den Einladungslink erneut öffnen."
      );
    }
    await redeemIfLoggedIn();
  }

  return (
    <MieterWlFrame brand={brand}>
      <MieterWlCard>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          Konto anlegen
        </h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          {brand.name} · {objektTitel}
          {einheitLabel ? ` · ${einheitLabel}` : ""}
        </p>

        {loading ? (
          <div className="mt-4">
            <PortalAuthBusy
              title="Konto wird angelegt…"
              body="Einen Moment — wir richten Ihren Zugang ein und senden den Code."
            />
          </div>
        ) : !canRegister ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-secondary">{statusHint}</p>
            <MieterWlBtn href="/portal/login">Zum Login</MieterWlBtn>
          </div>
        ) : awaitingOtp ? (
          <div className="mt-4 space-y-3">
            <PortalSignupOtpStep
              email={email.trim()}
              brand="meinbaerenwald"
              onVerified={afterOtpVerified}
            />
            <MieterWlBtn href="/portal/login">Zum Login</MieterWlBtn>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Name
              </span>
              <input
                className="input-field w-full"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                E-Mail
              </span>
              <input
                type="email"
                className="input-field w-full"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Telefon (optional)
              </span>
              <input
                className="input-field w-full"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Passwort
              </span>
              <input
                type="password"
                className="input-field w-full"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="flex items-start gap-2 text-[12.5px] text-text-secondary">
              <input
                type="checkbox"
                checked={datenschutz}
                onChange={(e) => setDatenschutz(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ich akzeptiere die{" "}
                <Link href="/datenschutz" className="text-accent underline">
                  Datenschutzerklärung
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-[12.5px] text-text-secondary">
              <input
                type="checkbox"
                checked={agb}
                onChange={(e) => setAgb(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ich akzeptiere die{" "}
                <Link href="/agb" className="text-accent underline">
                  AGB
                </Link>
                .
              </span>
            </label>
            <MieterWlBtn type="submit">Konto anlegen</MieterWlBtn>
            <p className="text-center text-[12px] text-text-tertiary">
              Bereits Konto?{" "}
              <Link
                href={`/portal/login?next=${encodeURIComponent(`/portal/einladung/${token}`)}`}
                className="font-semibold text-accent"
              >
                Anmelden
              </Link>
            </p>
          </form>
        )}
      </MieterWlCard>
    </MieterWlFrame>
  );
}
