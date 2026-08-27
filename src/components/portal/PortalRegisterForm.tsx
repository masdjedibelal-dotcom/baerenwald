"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { registerMeinBaerenwaldWithOtp } from "@/app/actions/portal-signup-otp";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalSignupOtpStep } from "@/components/portal/PortalSignupOtpStep";
import { AUTH_INVITE, type AuthPortalRole } from "@/lib/portal2/auth";
import {
  PORTAL_REGISTER_KUNDE_TYP_OPTIONS,
  type PortalRegisterKundeTyp,
} from "@/lib/portal/portal-register-kunde-typ";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type PortalRegisterPrefill = {
  name?: string;
  vorname?: string;
  nachname?: string;
  firma?: string;
  email?: string;
  telefon?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
  /** Felder Name/E-Mail/Telefon nur anzeigen, nicht ändern */
  locked?: boolean;
};

type Props = {
  /** Server-Prefill (Melde-Flow / Einladung); Query-Params greifen zusätzlich */
  prefill?: PortalRegisterPrefill;
  /** E4: Einladungs-Token — nach OTP einlösen */
  einladungToken?: string | null;
  /** Rolle aus Einladung (steuert Consent / Copy) */
  inviteRole?: AuthPortalRole | null;
  /** Hinweis über den locked Prefill-Feldern */
  lockedHint?: string | null;
  /** Submit-Label (Einladung: „Konto aktivieren“) */
  submitLabel?: string;
};

function splitPrefillName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { vorname: "", nachname: "" };
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  return { vorname: parts[0], nachname: parts.slice(1).join(" ") };
}

/**
 * MeinBärenwald-Registrierung mit E-Mail-OTP statt Bestätigungslink.
 * Auch Einladung Mieter/Eigentümer (gleiche Schritte & Design).
 */
export function PortalRegisterForm({
  prefill,
  einladungToken,
  inviteRole,
  lockedHint,
  submitLabel = "Konto anlegen",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromQuery = useMemo((): PortalRegisterPrefill => {
    const locked =
      searchParams.get("locked") === "1" ||
      searchParams.get("from") === "melde";
    return {
      name: searchParams.get("name")?.trim() || undefined,
      vorname: searchParams.get("vorname")?.trim() || undefined,
      nachname: searchParams.get("nachname")?.trim() || undefined,
      firma: searchParams.get("firma")?.trim() || undefined,
      email: searchParams.get("email")?.trim() || undefined,
      telefon: searchParams.get("telefon")?.trim() || undefined,
      strasse: searchParams.get("strasse")?.trim() || undefined,
      hausnummer: searchParams.get("hausnummer")?.trim() || undefined,
      plz: searchParams.get("plz")?.trim() || undefined,
      ort: searchParams.get("ort")?.trim() || undefined,
      locked,
    };
  }, [searchParams]);

  const locked = Boolean(prefill?.locked || fromQuery.locked);
  const initialFullName = prefill?.name?.trim() || fromQuery.name || "";
  const splitName = splitPrefillName(initialFullName);
  const initialEmail = prefill?.email?.trim() || fromQuery.email || "";
  const initialTelefon =
    prefill?.telefon?.trim() || fromQuery.telefon || "";

  const [kundentyp, setKundentyp] = useState<PortalRegisterKundeTyp | null>(
    null
  );
  const [kundentypError, setKundentypError] = useState(false);
  const [firma, setFirma] = useState(
    prefill?.firma?.trim() || fromQuery.firma || ""
  );
  const [vorname, setVorname] = useState(
    prefill?.vorname?.trim() || fromQuery.vorname || splitName.vorname
  );
  const [nachname, setNachname] = useState(
    prefill?.nachname?.trim() || fromQuery.nachname || splitName.nachname
  );
  const [strasse, setStrasse] = useState(
    prefill?.strasse?.trim() || fromQuery.strasse || ""
  );
  const [hausnummer, setHausnummer] = useState(
    prefill?.hausnummer?.trim() || fromQuery.hausnummer || ""
  );
  const [plz, setPlz] = useState(prefill?.plz?.trim() || fromQuery.plz || "");
  const [ort, setOrt] = useState(prefill?.ort?.trim() || fromQuery.ort || "");
  const [email, setEmail] = useState(initialEmail);
  const [telefon, setTelefon] = useState(initialTelefon);
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [agb, setAgb] = useState(false);
  const [datenschutzError, setDatenschutzError] = useState(false);
  const [agbError, setAgbError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  const inviteToken = einladungToken?.trim() || "";
  const askKundeTyp = !inviteToken;
  const isHausmeisterInvite = inviteRole === "hausmeister";
  /** Hausmeister: Werkzeugnutzer der HV — keine Kunden-AGB / keine Consent-Checkboxen. */
  const requireLegalConsent = !isHausmeisterInvite;
  const needsFirma =
    askKundeTyp &&
    (kundentyp === "gewerbe" || kundentyp === "hausverwaltung");
  const needsStammAdresse = askKundeTyp;

  const displayName = useMemo(() => {
    if (firma.trim()) return firma.trim();
    return [vorname.trim(), nachname.trim()].filter(Boolean).join(" ");
  }, [firma, vorname, nachname]);

  /** Locked: nur befüllte Felder zeigen — leere read-only Inputs wirken wie kaputt. */
  const showVorname = !locked || Boolean(vorname.trim());
  const showNachname = !locked || Boolean(nachname.trim());
  const showTelefon = !locked || Boolean(telefon.trim());
  const showNameRow =
    needsStammAdresse ||
    (Boolean(inviteToken) && (showVorname || showNachname));

  const nextPath =
    searchParams.get("next") ||
    (inviteToken
      ? `/portal/einladung/${encodeURIComponent(inviteToken)}`
      : "/portal");
  const loginHref = `/portal/login?next=${encodeURIComponent(nextPath)}${
    email.trim() ? `&email=${encodeURIComponent(email.trim())}` : ""
  }`;

  const hintText =
    lockedHint?.trim() ||
    (inviteToken
      ? isHausmeisterInvite
        ? AUTH_INVITE.lockedHintHausmeister
        : AUTH_INVITE.lockedHint
      : locked
        ? "Ihre Angaben aus der Schadenmeldung sind übernommen. Bitte Kundentyp wählen, Passwort vergeben und die Zustimmung erteilen."
        : null);

  async function redeemInviteIfNeeded() {
    if (!inviteToken) return;
    const res = await fetch(
      `/api/portal/einladung/${encodeURIComponent(inviteToken)}`,
      { method: "POST" }
    );
    const json = (await res.json()) as {
      error?: string;
      redirectTo?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Einladung konnte nicht eingelöst werden.");
    }
    router.replace(json.redirectTo || "/portal");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    if (askKundeTyp && !kundentyp) {
      setKundentypError(true);
      hasError = true;
    } else {
      setKundentypError(false);
    }
    if (needsFirma && !firma.trim()) {
      setError(
        kundentyp === "hausverwaltung"
          ? "Bitte Firmenname der Hausverwaltung angeben."
          : "Bitte Firmenname angeben."
      );
      hasError = true;
    }
    if (needsStammAdresse) {
      if (!vorname.trim() && !nachname.trim()) {
        setError("Bitte Vor- und Nachname angeben.");
        hasError = true;
      } else if (!strasse.trim() || !hausnummer.trim()) {
        setError("Bitte Straße und Hausnummer angeben.");
        hasError = true;
      } else if (!plz.trim() || !ort.trim()) {
        setError("Bitte PLZ und Ort angeben.");
        hasError = true;
      }
    }
    if (requireLegalConsent) {
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
    } else {
      setDatenschutzError(false);
      setAgbError(false);
    }
    if (hasError) return;

    setLoading(true);
    setError(null);
    const result = await registerMeinBaerenwaldWithOtp({
      name: displayName || email.trim(),
      vorname: vorname.trim() || undefined,
      nachname: nachname.trim() || undefined,
      firma: needsFirma ? firma.trim() : undefined,
      strasse: needsStammAdresse ? strasse.trim() : undefined,
      hausnummer: needsStammAdresse ? hausnummer.trim() : undefined,
      plz: needsStammAdresse ? plz.trim() : undefined,
      ort: needsStammAdresse ? ort.trim() : undefined,
      email,
      telefon,
      password,
      einladungToken: inviteToken || undefined,
      kundentyp: askKundeTyp ? kundentyp ?? undefined : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      const already =
        result.error.toLowerCase().includes("bereits registriert") &&
        Boolean(inviteToken);
      setError(
        already
          ? "Diese E-Mail ist bereits registriert. Bitte unten auf „Anmelden“ tippen — danach wird die Einladung automatisch eingelöst."
          : result.error
      );
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
        inviteToken
          ? "Konto bestätigt — bitte anmelden und den Einladungslink erneut öffnen."
          : "Konto bestätigt — bitte mit Passwort anmelden."
      );
    }
    if (inviteToken) {
      await redeemInviteIfNeeded();
      return;
    }
    const safeNext =
      typeof nextPath === "string" && nextPath.startsWith("/portal")
        ? nextPath
        : "/portal";
    router.replace(safeNext);
  }

  if (loading) {
    return (
      <PortalAuthBusy
        title="Konto wird angelegt…"
        body="Einen Moment — wir richten Ihren Zugang ein und senden den Code."
      />
    );
  }

  if (awaitingOtp) {
    return (
      <div className="space-y-4">
        <PortalSignupOtpStep
          email={email.trim()}
          brand="meinbaerenwald"
          onVerified={afterOtpVerified}
        />
        <p className="text-center portal-text-body text-text-secondary">
          <Link
            href={loginHref}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Zum Login
          </Link>
        </p>
      </div>
    );
  }

  const fieldClass = locked
    ? "portal-input w-full rounded-xl border border-border-default bg-muted/40 px-3 py-3 text-text-secondary"
    : "portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent";

  const canSubmitInvite = !locked || Boolean(email.trim() && displayName);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hintText ? (
        <p className="rounded-lg border border-border-light bg-muted/30 px-3 py-2.5 text-[13px] leading-relaxed text-text-secondary">
          {hintText}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">
          {error}
        </p>
      ) : null}

      {askKundeTyp ? (
        <fieldset className="space-y-2">
          <legend className="portal-form-label">Ich bin …</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PORTAL_REGISTER_KUNDE_TYP_OPTIONS.map((opt) => {
              const active = kundentyp === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setKundentyp(opt.value);
                    setKundentypError(false);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition",
                    active
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border-default bg-surface-card hover:border-accent/40"
                  )}
                >
                  <span className="block text-sm font-semibold text-text-primary">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
          {kundentypError ? (
            <p className="portal-text-body text-red-700">
              Bitte wählen Sie Privat, Gewerbe oder Hausverwaltung.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {needsFirma ? (
        <label className="block space-y-1.5">
          <span className="portal-form-label">
            {kundentyp === "hausverwaltung" ? "Firmenname" : "Firmenname"}
          </span>
          <input
            type="text"
            autoComplete="organization"
            required
            value={firma}
            onChange={(e) => setFirma(e.target.value)}
            className={fieldClass}
          />
        </label>
      ) : null}

      {showNameRow ? (
        <div
          className={cn(
            "grid gap-4",
            showVorname && showNachname ? "sm:grid-cols-2" : "sm:grid-cols-1"
          )}
        >
          {showVorname ? (
            <label className="block space-y-1.5">
              <span className="portal-form-label">Vorname</span>
              <input
                type="text"
                autoComplete="given-name"
                required={needsStammAdresse}
                value={vorname}
                onChange={(e) => {
                  if (!locked) setVorname(e.target.value);
                }}
                readOnly={locked}
                className={fieldClass}
              />
            </label>
          ) : null}
          {showNachname ? (
            <label className="block space-y-1.5">
              <span className="portal-form-label">Nachname</span>
              <input
                type="text"
                autoComplete="family-name"
                required={needsStammAdresse}
                value={nachname}
                onChange={(e) => {
                  if (!locked) setNachname(e.target.value);
                }}
                readOnly={locked}
                className={fieldClass}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {needsStammAdresse ? (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <label className="block space-y-1.5">
              <span className="portal-form-label">Straße</span>
              <input
                type="text"
                autoComplete="address-line1"
                required
                value={strasse}
                onChange={(e) => setStrasse(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="portal-form-label">Nr.</span>
              <input
                type="text"
                autoComplete="address-line2"
                required
                value={hausnummer}
                onChange={(e) => setHausnummer(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
            <label className="block space-y-1.5">
              <span className="portal-form-label">PLZ</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                required
                value={plz}
                onChange={(e) => setPlz(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="portal-form-label">Ort</span>
              <input
                type="text"
                autoComplete="address-level2"
                required
                value={ort}
                onChange={(e) => setOrt(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        </>
      ) : null}

      <label className="block space-y-1.5">
        <span className="portal-form-label">E-Mail</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            if (!locked) setEmail(e.target.value);
          }}
          readOnly={locked}
          className={fieldClass}
        />
      </label>

      {showTelefon ? (
        <label className="block space-y-1.5">
          <span className="portal-form-label">
            Telefon{" "}
            {!locked ? (
              <span className="text-text-tertiary">(optional)</span>
            ) : null}
          </span>
          <input
            type="tel"
            autoComplete="tel"
            value={telefon}
            onChange={(e) => {
              if (!locked) setTelefon(e.target.value);
            }}
            readOnly={locked}
            className={fieldClass}
          />
        </label>
      ) : null}

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

      {requireLegalConsent ? (
        <>
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
              gelesen und stimme der Verarbeitung meiner Daten in MeinBärenwald
              zu.
            </span>
          </label>
          {datenschutzError ? (
            <p className="portal-text-body -mt-2 text-red-700">
              Bitte stimmen Sie der Datenschutzerklärung zu.
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
              gelesen und akzeptiere sie für die Nutzung des Kundenportals sowie
              für künftige Beauftragungen über Bärenwald.
            </span>
          </label>
          {agbError ? (
            <p className="portal-text-body -mt-2 text-red-700">
              Bitte akzeptieren Sie die AGB.
            </p>
          ) : null}
        </>
      ) : (
        <p className="portal-text-body text-text-secondary">
          Mit der Aktivierung gilt die{" "}
          <a
            href="/datenschutz#meinbaerenwald"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Datenschutzerklärung
          </a>{" "}
          für Ihr Login bei MeinBärenwald. Die Nutzung erfolgt im Auftrag Ihrer
          Verwaltung — keine Kunden-AGB.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmitInvite}
        className="btn-pill-primary portal-btn w-full disabled:opacity-60"
      >
        {submitLabel}
      </button>

      <p className="border-t border-border-light pt-4 text-center portal-text-body text-text-secondary">
        Bereits registriert?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Anmelden
        </Link>
      </p>
    </form>
  );
}
