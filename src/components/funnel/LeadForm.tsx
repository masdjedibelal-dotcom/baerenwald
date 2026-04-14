"use client";

import { useState } from "react";

import { serializeFunnelStateForApi } from "@/lib/funnel-serialize";
import type { FunnelState } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  /** Zusätzliches Notizfeld unter PLZ */
  showAnmerkungen?: boolean;
  className?: string;
}

const inputCls =
  "w-full rounded-xl border border-border-default px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-funnel-accent";

export function LeadForm({
  funnel,
  value: state,
  onChange,
  errors: errorsProp,
  onSuccess,
  formId = "funnel-lead-form",
  showAnmerkungen = true,
  className,
}: LeadFormProps) {
  const [attempted, setAttempted] = useState(false);
  const errors = errorsProp ?? {};
  const showErr = (k: keyof LeadFormErrors) =>
    attempted && errors[k] === true;

  const v = {
    vorname: state.vorname.trim().length > 0,
    nachname: state.nachname.trim().length > 0,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()),
    telefon: state.telefon.trim().length >= 5,
    plz: /^\d{5}$/.test(state.plz.trim()),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!v.vorname || !v.nachname || !v.email || !v.telefon || !v.plz) {
      return;
    }
    const name = `${state.vorname} ${state.nachname}`.trim();
    const payload = serializeFunnelStateForApi({
      ...funnel,
      ...state,
      name,
    });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success?: boolean };
      if (!res.ok || !data.success) throw new Error("Lead failed");
      onSuccess?.();
    } catch {
      /* optional: toast */
    }
  };

  return (
    <form
      id={formId}
      className={cn(className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className={cn(inputCls, showErr("vorname") && "border-[#C0392B]")}
          placeholder="Vorname"
          value={state.vorname}
          onChange={(e) => onChange({ vorname: e.target.value })}
          autoComplete="given-name"
        />
        <input
          className={cn(inputCls, showErr("nachname") && "border-[#C0392B]")}
          placeholder="Nachname"
          value={state.nachname}
          onChange={(e) => onChange({ nachname: e.target.value })}
          autoComplete="family-name"
        />
        <input
          type="email"
          className={cn(inputCls, showErr("email") && "border-[#C0392B]")}
          placeholder="E-Mail"
          value={state.email}
          onChange={(e) => onChange({ email: e.target.value })}
          autoComplete="email"
        />
        <input
          type="tel"
          className={cn(inputCls, showErr("telefon") && "border-[#C0392B]")}
          placeholder="Telefon"
          value={state.telefon}
          onChange={(e) => onChange({ telefon: e.target.value })}
          autoComplete="tel"
        />
      </div>
      <div className="mt-3">
        <input
          className={cn(inputCls, showErr("plz") && "border-[#C0392B]")}
          placeholder="PLZ"
          inputMode="numeric"
          maxLength={5}
          value={state.plz}
          onChange={(e) =>
            onChange({ plz: e.target.value.replace(/\D/g, "").slice(0, 5) })
          }
          autoComplete="postal-code"
        />
      </div>
      {showAnmerkungen ? (
        <div className="mt-3">
          <textarea
            rows={3}
            placeholder="Anmerkungen (optional)"
            className={cn(inputCls, "resize-none")}
            value={state.anmerkungen}
            onChange={(e) => onChange({ anmerkungen: e.target.value })}
          />
        </div>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
        Mit Absenden akzeptierst du, dass wir dich zum Termin / Angebot
        kontaktieren. Du kannst der Nutzung jederzeit widersprechen.
      </p>
      <button type="submit" className="sr-only" tabIndex={-1}>
        Senden
      </button>
    </form>
  );
}
