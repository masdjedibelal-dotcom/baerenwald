"use client";

import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { cn } from "@/lib/utils";

export interface HWLeadFormProps {
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  name: string;
  email: string;
  telefon: string;
  strasse: string;
  hausnummer: string;
  onFieldChange: (
    field: "name" | "email" | "telefon" | "strasse" | "hausnummer",
    value: string
  ) => void;
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function HWLeadForm({
  photos,
  onPhotosChange,
  name,
  email,
  telefon,
  strasse,
  hausnummer,
  onFieldChange,
  formId,
  onSubmit,
  className,
}: HWLeadFormProps) {
  return (
    <div id="lead-form" className={cn(className)}>
      <PhotoUpload
        files={photos}
        onChange={onPhotosChange}
        className="mb-4"
        showCompareOfferHint={true}
      />

      <form id={formId} onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="name"
            autoCapitalize="words"
            className="funnel-input"
            placeholder="Name"
            value={name}
            onChange={(e) => onFieldChange("name", e.target.value)}
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="funnel-input"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => onFieldChange("email", e.target.value)}
          />
        </div>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="funnel-input"
          placeholder="+49 151 23456789"
          value={telefon}
          onChange={(e) => onFieldChange("telefon", e.target.value)}
        />
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <input
            type="text"
            inputMode="text"
            autoComplete="street-address"
            autoCapitalize="words"
            className="funnel-input"
            placeholder="Straße"
            value={strasse}
            onChange={(e) => onFieldChange("strasse", e.target.value)}
          />
          <input
            type="text"
            inputMode="text"
            autoComplete="address-line2"
            className="funnel-input"
            placeholder="Nr."
            value={hausnummer}
            onChange={(e) => onFieldChange("hausnummer", e.target.value)}
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
