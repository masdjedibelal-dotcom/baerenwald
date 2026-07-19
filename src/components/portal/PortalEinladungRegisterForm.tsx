"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MieterWlBtn,
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";
import { portalAuthCallbackUrl } from "@/lib/portal/portal-auth-url";
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
 * E4 — Konto anlegen im HV-Branding; nach Confirm Einlösung → /portal (D10).
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
  const [success, setSuccess] = useState(false);

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
    try {
      const supabase = getSupabaseBrowserClient();
      const now = new Date().toISOString();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: portalAuthCallbackUrl(
            `/portal/einladung/${encodeURIComponent(token)}`
          ),
          data: {
            name: name.trim(),
            telefon: telefon.trim() || null,
            datenschutz_akzeptiert_at: now,
            agb_akzeptiert_at: now,
            portal_einladung_token: token,
          },
        },
      });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("E-Mail bereits registriert — bitte anmelden und Link erneut öffnen.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Session sofort verfügbar (wenn Confirm aus) → einlösen
      if (data.session) {
        await redeemIfLoggedIn();
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MieterWlFrame brand={brand} lang="de">
      <MieterWlCard>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          Konto anlegen
        </h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          {brand.name} · {objektTitel}
          {einheitLabel ? ` · ${einheitLabel}` : ""}
        </p>

        {!canRegister ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-text-secondary">{statusHint}</p>
            <MieterWlBtn href="/portal/login">Zum Login</MieterWlBtn>
          </div>
        ) : success ? (
          <div className="mt-4 space-y-3 text-[13.5px] text-text-secondary">
            <p>
              Bitte E-Mail bestätigen. Danach öffnen Sie den Einladungslink erneut
              oder melden sich an — die Wohnung wird zugeordnet.
            </p>
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
            <MieterWlBtn type="submit" disabled={loading}>
              {loading ? "Wird angelegt…" : "Konto anlegen"}
            </MieterWlBtn>
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
