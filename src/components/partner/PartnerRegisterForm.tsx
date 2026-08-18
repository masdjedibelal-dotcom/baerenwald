"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { acceptPartnerRahmenvertragForEmail } from "@/app/actions/partner-vertrag";
import { verifyPartnerRegistrationEmail } from "@/app/actions/partner-registration";
import { assertPartnerEmailAllowed } from "@/app/actions/assert-partner-email-allowed";
import { getPartnerRahmenvertragPreview } from "@/app/actions/partner-rahmenvertrag-preview";
import { PartnerRahmenvertragAcceptBlock } from "@/components/partner/PartnerRahmenvertragAcceptBlock";
import { PartnerAuthFlowHint } from "@/components/partner/PartnerAuthFlowHint";
import { PartnerRegisterStepNav } from "@/components/partner/PartnerRegisterStepNav";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalResendConfirmation } from "@/components/portal/PortalResendConfirmation";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { partnerAuthCallbackUrl } from "@/lib/partner/partner-auth-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const BEDINGUNGEN_ERROR =
  "Bitte die Geschäftsbedingungen durchlesen und die Annahme bestätigen.";

export function PartnerRegisterForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [rahmenAkzeptiert, setRahmenAkzeptiert] = useState(false);
  const [datenschutzError, setDatenschutzError] = useState(false);
  const [rahmenError, setRahmenError] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewVertragsNr, setPreviewVertragsNr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadPreview = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setPreviewPdfUrl(null);
      setPreviewVertragsNr(null);
      return;
    }
    setPreviewLoading(true);
    const preview = await getPartnerRahmenvertragPreview(trimmed);
    setPreviewLoading(false);
    setPreviewPdfUrl(preview.pdfUrl);
    setPreviewVertragsNr(preview.vertragsNr);
    if (preview.portalAkzeptiert) {
      setRahmenAkzeptiert(true);
    }
  }, []);

  async function goToStep2() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Bitte gib eine gültige E-Mail ein.");
      return;
    }
    setError(null);
    setPreviewLoading(true);
    const check = await verifyPartnerRegistrationEmail(trimmed);
    if (!check.ok) {
      setPreviewLoading(false);
      setError(check.error);
      return;
    }
    await loadPreview(trimmed);
    setPreviewLoading(false);
    setStep(2);
  }

  function goToStep3() {
    if (!rahmenAkzeptiert) {
      setRahmenError(true);
      return;
    }
    setRahmenError(false);
    setError(null);
    setStep(3);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datenschutz) {
      setDatenschutzError(true);
      return;
    }
    setDatenschutzError(false);

    setLoading(true);
    setError(null);
    const trimmedEmail = email.trim();

    const allowed = await assertPartnerEmailAllowed(trimmedEmail);
    if (!allowed.ok) {
      setLoading(false);
      setError(allowed.error);
      return;
    }

    const rvRes = await acceptPartnerRahmenvertragForEmail({
      email: trimmedEmail,
      akzeptiert: rahmenAkzeptiert,
    });
    if (!rvRes.ok) {
      setLoading(false);
      setError(rvRes.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: partnerAuthCallbackUrl(),
        data: {
          portal_role: "handwerker",
          rv_akzeptiert_at: new Date().toISOString(),
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    const identities = data.user?.identities ?? [];
    if (identities.length === 0) {
      setError(PARTNER_AUTH_COPY.errors.bereitsRegistriert);
      return;
    }
    setSuccess(true);
  }

  if (loading || previewLoading) {
    return (
      <PortalAuthBusy
        title={previewLoading ? "E-Mail wird geprüft…" : "Konto wird angelegt…"}
        body={
          previewLoading
            ? "Einen Moment — wir prüfen deinen Partner-Zugang."
            : "Einen Moment — Vertrag und Konto werden eingerichtet."
        }
      />
    );
  }

  if (success) {
    return (
      <div className="space-y-3 text-center portal-text-body text-text-secondary">
        <p>{PARTNER_AUTH_COPY.confirmEmailSuccess}</p>
        <PortalResendConfirmation defaultEmail={email} />
        <Link href="/partner/login" className="font-semibold text-accent hover:underline">
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerAuthFlowHint variant="register" />
      <p className="portal-text-meta text-text-tertiary">
        {PARTNER_AUTH_COPY.registerIntro}
      </p>

      <PartnerRegisterStepNav current={step} />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 portal-text-body text-red-800">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="portal-form-label">Partner-E-Mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
              placeholder="deine@firma.de"
            />
          </label>
          <p className="portal-text-meta text-text-tertiary">
            {PARTNER_AUTH_COPY.registerEmailHint}
          </p>
          <button
            type="button"
            onClick={() => void goToStep2()}
            className="btn-pill-primary w-full !py-2.5"
          >
            Weiter zu den Bedingungen
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="portal-text-body text-text-secondary">
            E-Mail: <strong className="text-text-primary">{email}</strong>
          </p>
          <PartnerRahmenvertragAcceptBlock
            variant="register"
            pdfUrl={previewPdfUrl}
            vertragsNr={previewVertragsNr}
            akzeptiert={rahmenAkzeptiert}
            onAkzeptiertChange={(v) => {
              setRahmenAkzeptiert(v);
              if (v) setRahmenError(false);
            }}
            error={rahmenError ? BEDINGUNGEN_ERROR : null}
          />
          {previewLoading ? (
            <p className="portal-text-meta text-text-tertiary">PDF-Status wird geprüft…</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-pill-outline flex-1 !py-2.5"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={goToStep3}
              className="btn-pill-primary flex-1 !py-2.5"
            >
              Weiter
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="portal-form-label">Passwort (min. 8 Zeichen)</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3 focus:border-accent"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-light bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={datenschutz}
              onChange={(e) => {
                setDatenschutz(e.target.checked);
                if (e.target.checked) setDatenschutzError(false);
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#2E7D52]"
            />
            <span className="portal-text-body text-text-primary">
              Ich habe die{" "}
              <a
                href="/datenschutz#partner-portal"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Datenschutzerklärung
              </a>{" "}
              gelesen und stimme der Verarbeitung meiner Daten im Partner-Portal zu.
            </span>
          </label>
          {datenschutzError ? (
            <p className="portal-text-body text-red-700">
              Bitte stimme der Datenschutzerklärung zu.
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-pill-outline flex-1 !py-2.5"
            >
              Zurück
            </button>
            <button
              type="submit"
              className="btn-pill-primary flex-1 !py-2.5"
            >
              Konto anlegen
            </button>
          </div>
        </form>
      ) : null}

      <p className="text-center portal-text-body text-text-secondary">
        Bereits registriert?{" "}
        <Link href="/partner/login" className="font-semibold text-accent hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
