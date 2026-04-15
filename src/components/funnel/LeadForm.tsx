"use client";

import { useState } from "react";

import { serializeFunnelStateForApi } from "@/lib/funnel-serialize";
import { SITE_CONFIG } from "@/lib/config";
import type { FunnelState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DatenschutzCheckbox } from "./DatenschutzCheckbox";

export type LeadData = Pick<
  FunnelState,
  "vorname" | "nachname" | "email" | "telefon" | "plz" | "anmerkungen"
>;

export type LeadFormErrors = Partial<
  Record<"vorname" | "nachname" | "email" | "telefon" | "plz", boolean>
>;

export interface LeadFormProps {
  funnel: FunnelState;
  value: LeadData;
  onChange: (patch: Partial<LeadData>) => void;
  errors?: LeadFormErrors;
  onSuccess?: () => void;
  formId?: string;
  showAnmerkungen?: boolean;
  className?: string;
}

type FieldKey = "vorname" | "nachname" | "telefon" | "email";

interface FieldErrors {
  vorname?: string;
  nachname?: string;
  telefon?: string;
  email?: string;
}

function validateForm(data: LeadData): FieldErrors {
  const e: FieldErrors = {};

  if (!data.vorname.trim()) {
    e.vorname = "Bitte gib deinen Vornamen ein.";
  }
  if (!data.nachname.trim()) {
    e.nachname = "Bitte gib deinen Nachnamen ein.";
  }

  const tel = data.telefon.replace(/[\s\-]/g, "");
  if (!tel) {
    e.telefon = "Telefonnummer wird benötigt.";
  } else if (!/^(\+49|0)[1-9]\d{6,13}$/.test(tel)) {
    e.telefon = "Bitte gib eine gültige Telefonnummer ein.";
  }

  if (
    data.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
  ) {
    e.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  return e;
}

const baseCls =
  "funnel-input w-full rounded-xl border border-border-default px-3 py-2.5 text-base text-text-primary outline-none transition-colors focus:border-funnel-accent";

function fieldCls(
  key: FieldKey,
  touched: Record<FieldKey, boolean>,
  errors: FieldErrors
): string {
  if (!touched[key]) return baseCls;
  if (errors[key]) return cn(baseCls, "input-error");
  return cn(baseCls, "input-valid");
}

function Spinner() {
  return <span className="btn-spinner" aria-hidden />;
}

export function LeadForm({
  funnel,
  value: data,
  onChange,
  onSuccess,
  formId = "funnel-lead-form",
  showAnmerkungen = true,
  className,
}: LeadFormProps) {
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    vorname: false,
    nachname: false,
    telefon: false,
    email: false,
  });

  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);
  const [showDatenschutzError, setShowDatenschutzError] = useState(false);

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const errors = validateForm(data);
  const hasErrors = Object.keys(errors).length > 0;

  const touch = (key: FieldKey) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Alle Felder als touched markieren
    setTouched({ vorname: true, nachname: true, telefon: true, email: true });

    if (!datenschutzAccepted) {
      setShowDatenschutzError(true);
    }

    if (hasErrors || !datenschutzAccepted) return;

    setSubmitStatus("loading");
    setErrorMessage("");

    const name = `${data.vorname} ${data.nachname}`.trim();
    const payload = serializeFunnelStateForApi({ ...funnel, ...data, name });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as { success?: boolean };
      if (!json.success) throw new Error("success=false");

      setSubmitStatus("success");
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        setErrorMessage(
          "Die Verbindung hat zu lange gedauert. Bitte versuche es erneut."
        );
      } else {
        setErrorMessage(
          "Etwas ist schiefgelaufen. Bitte versuche es erneut oder ruf uns direkt an."
        );
      }
      setSubmitStatus("error");
    }
  };

  const submitLabel =
    submitStatus === "loading"
      ? "Wird gesendet..."
      : submitStatus === "error"
        ? "Erneut versuchen →"
        : "Anfrage senden →";

  const telHref = SITE_CONFIG.phoneHref;

  return (
    <form
      id={formId}
      className={cn("space-y-3", className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Vorname */}
        <div>
          <input
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoCapitalize="words"
            placeholder="Vorname"
            className={fieldCls("vorname", touched, errors)}
            value={data.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
            onBlur={() => touch("vorname")}
          />
          {touched.vorname && errors.vorname ? (
            <p className="field-error">{errors.vorname}</p>
          ) : null}
        </div>

        {/* Nachname */}
        <div>
          <input
            type="text"
            inputMode="text"
            autoComplete="family-name"
            autoCapitalize="words"
            placeholder="Nachname"
            className={fieldCls("nachname", touched, errors)}
            value={data.nachname}
            onChange={(e) => onChange({ nachname: e.target.value })}
            onBlur={() => touch("nachname")}
          />
          {touched.nachname && errors.nachname ? (
            <p className="field-error">{errors.nachname}</p>
          ) : null}
        </div>
      </div>

      {/* E-Mail */}
      <div>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="E-Mail (optional)"
          className={fieldCls("email", touched, errors)}
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={() => touch("email")}
        />
        {touched.email && errors.email ? (
          <p className="field-error">{errors.email}</p>
        ) : null}
      </div>

      {/* Telefon */}
      <div>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+49 oder 0..."
          className={fieldCls("telefon", touched, errors)}
          value={data.telefon}
          onChange={(e) => onChange({ telefon: e.target.value })}
          onBlur={() => touch("telefon")}
        />
        {touched.telefon && errors.telefon ? (
          <p className="field-error">{errors.telefon}</p>
        ) : null}
      </div>

      {/* PLZ */}
      <div>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          autoComplete="postal-code"
          placeholder="PLZ"
          className={baseCls}
          value={data.plz}
          onChange={(e) =>
            onChange({ plz: e.target.value.replace(/\D/g, "").slice(0, 5) })
          }
        />
      </div>

      {/* Anmerkungen */}
      {showAnmerkungen ? (
        <div>
          <textarea
            rows={3}
            autoCapitalize="sentences"
            autoCorrect="on"
            placeholder="Anmerkungen (optional)"
            className={cn(baseCls, "resize-none")}
            value={data.anmerkungen}
            onChange={(e) => onChange({ anmerkungen: e.target.value })}
          />
        </div>
      ) : null}

      <DatenschutzCheckbox
        checked={datenschutzAccepted}
        onChange={(v) => {
          setDatenschutzAccepted(v);
          if (v) setShowDatenschutzError(false);
        }}
        showError={showDatenschutzError}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={
          submitStatus === "loading" ||
          !datenschutzAccepted ||
          (submitStatus !== "error" && hasErrors)
        }
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity",
          (submitStatus === "loading") && "opacity-70 cursor-not-allowed",
          (submitStatus !== "error" && hasErrors) && "opacity-40"
        )}
      >
        {submitStatus === "loading" ? <Spinner /> : null}
        {submitLabel}
      </button>

      {/* Fehler-Box */}
      {submitStatus === "error" ? (
        <div className="submit-error-box">
          <p className="submit-error-text">{errorMessage}</p>
          <a href={telHref} className="submit-error-tel">
            Oder direkt anrufen →
          </a>
        </div>
      ) : null}
    </form>
  );
}
