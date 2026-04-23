"use client";

import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import type { Situation } from "@/lib/funnel/types";

export type BwBeratungLeadKind = "b2b" | "schimmel";

export interface BwBeratungLeadProps {
  kind: BwBeratungLeadKind;
  situation?: Situation | null;
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  beschreibung: string;
  datenschutz: boolean;
  datenschutzError: boolean;
  onDatenschutzChange: (v: boolean) => void;
  onFieldChange: (field: string, value: string) => void;
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function BwBeratungLead({
  kind,
  situation,
  vorname,
  nachname,
  telefon,
  email,
  beschreibung,
  datenschutz,
  datenschutzError,
  onDatenschutzChange,
  onFieldChange,
  formId,
  onSubmit,
}: BwBeratungLeadProps) {
  const eyebrow =
    kind === "schimmel" ? "Schimmel / Feuchtigkeit" : "Gewerbe";
  const headline =
    kind === "schimmel"
      ? "Schimmel braucht eine Vor-Ort-Analyse."
      : "Gewerbliches Projekt?";
  const sub =
    kind === "schimmel"
      ? "Eine automatische Preisberechnung wäre hier nicht seriös — zu viel hängt von der Ursache ab. Wir schauen es uns an und melden uns persönlich."
      : "Ob Büro, Praxis, Laden oder Gastronomie — wir planen individuell mit dir. Melde dich kurz und wir melden uns innerhalb von 24h.";

  return (
    <StepWrapper
      animateKey={`beratung-lead-${kind}-${situation ?? ""}`}
      className="bw-beratung-lead"
    >
      <div className="step-wrapper">
        <p className="step-eyebrow">{eyebrow}</p>
        <h1 className="step-question">{headline}</h1>
        <p className="step-sub">{sub}</p>

        <form id={formId} onSubmit={onSubmit} className="b2b-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Vorname"
              autoComplete="given-name"
              autoCapitalize="words"
              className="funnel-input"
              value={vorname}
              onChange={(e) => onFieldChange("vorname", e.target.value)}
            />
            <input
              type="text"
              placeholder="Nachname"
              autoComplete="family-name"
              autoCapitalize="words"
              className="funnel-input"
              value={nachname}
              onChange={(e) => onFieldChange("nachname", e.target.value)}
            />
          </div>

          <input
            type="tel"
            inputMode="tel"
            placeholder="+49 151 23456789"
            autoComplete="tel"
            className="funnel-input"
            value={telefon}
            onChange={(e) => onFieldChange("telefon", e.target.value)}
          />

          <input
            type="email"
            inputMode="email"
            placeholder="E-Mail Adresse"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="funnel-input"
            value={email}
            onChange={(e) => onFieldChange("email", e.target.value)}
          />

          <textarea
            placeholder="Kurze Beschreibung — was planst du?"
            className="funnel-textarea"
            rows={3}
            value={beschreibung}
            onChange={(e) =>
              onFieldChange("leadBeschreibung", e.target.value)
            }
          />

          <DatenschutzCheckbox
            checked={datenschutz}
            onChange={onDatenschutzChange}
            showError={datenschutzError}
          />
        </form>
      </div>
    </StepWrapper>
  );
}
