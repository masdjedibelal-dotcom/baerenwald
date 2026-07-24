"use client";

import { cn } from "@/lib/utils";

export interface HWLeadFormProps {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  onFieldChange: (
    field:
      | "vorname"
      | "nachname"
      | "email"
      | "telefon"
      | "strasse"
      | "hausnummer"
      | "ort",
    value: string
  ) => void;
  onPlzChange: (plz: string) => void;
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function HWLeadForm({
  vorname,
  nachname,
  email,
  telefon,
  strasse,
  hausnummer,
  plz,
  ort,
  onFieldChange,
  onPlzChange,
  formId,
  onSubmit,
  className,
}: HWLeadFormProps) {
  return (
    <div id="lead-form" className={cn(className)}>
      <form id={formId} onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoCapitalize="words"
            required
            className="funnel-input"
            placeholder="Vorname"
            value={vorname}
            onChange={(e) => onFieldChange("vorname", e.target.value)}
          />
          <input
            type="text"
            inputMode="text"
            autoComplete="family-name"
            autoCapitalize="words"
            required
            className="funnel-input"
            placeholder="Nachname"
            value={nachname}
            onChange={(e) => onFieldChange("nachname", e.target.value)}
          />
        </div>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="funnel-input"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => onFieldChange("email", e.target.value)}
        />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="funnel-input"
          placeholder="Telefon (optional)"
          value={telefon}
          onChange={(e) => onFieldChange("telefon", e.target.value)}
        />
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <input
            type="text"
            inputMode="text"
            autoComplete="address-line1"
            autoCapitalize="words"
            required
            className="funnel-input"
            placeholder="Straße"
            value={strasse}
            onChange={(e) => onFieldChange("strasse", e.target.value)}
          />
          <input
            type="text"
            inputMode="text"
            autoComplete="address-line2"
            required
            className="funnel-input"
            placeholder="Nr."
            value={hausnummer}
            onChange={(e) => onFieldChange("hausnummer", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            required
            className="funnel-input"
            placeholder="PLZ"
            value={plz}
            onChange={(e) =>
              onPlzChange(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
          />
          <input
            type="text"
            inputMode="text"
            autoComplete="address-level2"
            autoCapitalize="words"
            required
            className="funnel-input"
            placeholder="Ort"
            value={ort}
            onChange={(e) => onFieldChange("ort", e.target.value)}
          />
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#9CA3AF",
            marginTop: "12px",
            lineHeight: 1.5,
          }}
        >
          Mit Weiter stimmst du zu, dass wir dich zur Bearbeitung deiner
          Anfrage kontaktieren. Weitere Infos in unserer{" "}
          <a
            href="/datenschutz"
            style={{
              color: "#2E7D52",
              textDecoration: "underline",
            }}
          >
            Datenschutzerklärung
          </a>
          .
        </p>
        <p className="text-[11px] leading-relaxed text-text-tertiary">
          Unverbindlicher Preisrahmen / Preisindikation auf Basis unserer
          Projekterfahrung in München. Verbindliches Festpreisangebot nach
          Vor-Ort-Termin.
        </p>
      </form>
    </div>
  );
}
