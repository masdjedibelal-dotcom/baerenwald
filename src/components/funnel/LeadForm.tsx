"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { serializeFunnelStateForApi } from "@/lib/funnel-serialize";
import type { FunnelState } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LeadFormErrors = Partial<
  Record<"vorname" | "nachname" | "email" | "telefon" | "plz", boolean>
>;

export interface LeadFormProps {
  /** Vollständiger Funnel für API-Serialisierung */
  funnel: FunnelState;
  value: Pick<
    FunnelState,
    "vorname" | "nachname" | "email" | "telefon" | "plz" | "anmerkungen"
  >;
  onChange: (
    patch: Partial<
      Pick<
        FunnelState,
        "vorname" | "nachname" | "email" | "telefon" | "plz" | "anmerkungen"
      >
    >
  ) => void;
  errors?: LeadFormErrors;
  onSuccess?: () => void;
  formId?: string;
  className?: string;
}

export function LeadForm({
  funnel,
  value: state,
  onChange,
  errors: errorsProp,
  onSuccess,
  formId = "funnel-lead-form",
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

  const inputCls =
    "h-auto rounded-[var(--r)] border border-[#e8e8e8] px-3 py-2.5 text-[13px] outline-none transition-colors focus-visible:border-funnel-accent";

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
      className={cn("fade-in rounded-[18px] border border-[#e8e8e8] bg-white p-4", className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <h3 className="mb-3 text-[14px] font-medium text-text-primary">
        Deine Kontaktdaten
      </h3>
      <div className="grid grid-cols-1 gap-[9px] sm:grid-cols-2">
        <div>
          <Input
            className={cn(
              inputCls,
              showErr("vorname") && "border-[#C0392B]"
            )}
            placeholder="Vorname"
            value={state.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
            autoComplete="given-name"
          />
        </div>
        <div>
          <Input
            className={cn(
              inputCls,
              showErr("nachname") && "border-[#C0392B]"
            )}
            placeholder="Nachname"
            value={state.nachname}
            onChange={(e) => onChange({ nachname: e.target.value })}
            autoComplete="family-name"
          />
        </div>
        <div>
          <Input
            type="email"
            className={cn(inputCls, showErr("email") && "border-[#C0392B]")}
            placeholder="E-Mail"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <Input
            type="tel"
            className={cn(inputCls, showErr("telefon") && "border-[#C0392B]")}
            placeholder="Telefon"
            value={state.telefon}
            onChange={(e) => onChange({ telefon: e.target.value })}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="mt-[9px]">
        <Input
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
      <div className="mt-[9px]">
        <textarea
          rows={3}
          placeholder="Anmerkungen (optional)"
          className={cn(
            inputCls,
            "w-full resize-none"
          )}
          value={state.anmerkungen}
          onChange={(e) => onChange({ anmerkungen: e.target.value })}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-normal text-[#999]">
        Mit Absenden akzeptierst du, dass wir dich zum Termin / Angebot
        kontaktieren. Du kannst der Nutzung jederzeit widersprechen.
      </p>
      <button type="submit" className="sr-only" tabIndex={-1}>
        Senden
      </button>
    </form>
  );
}
