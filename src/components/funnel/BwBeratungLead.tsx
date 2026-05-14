"use client";

import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { SITE_CONFIG } from "@/lib/config";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import type { Situation } from "@/lib/funnel/types";

/** Notfall-Hotline (Baum / Sturmschaden) — Footer-CTA wählt diese Nummer. */
export const BW_BAUM_NOTFALL_TEL_HREF = "tel:+498999733904";

export type BwBeratungLeadKind =
  | "b2b"
  | "schimmel"
  | "garten_planung"
  | "garten_terrasse"
  | "baum_notfall"
  | "gefahrenabwehr";

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
  if (kind === "baum_notfall") {
    return (
      <StepWrapper
        animateKey={`beratung-lead-baum_notfall-${situation ?? ""}`}
        className="bw-beratung-lead"
      >
        <div className="step-wrapper">
          <p className="step-eyebrow">Reparatur & Notfall</p>
          <h1 className="step-question">Baum / Sturmschaden</h1>
          <p className="step-sub whitespace-pre-line">
            Baumnotfälle sind sehr individuell — Größe, Lage und Zugänglichkeit
            bestimmen den Aufwand. Wir kommen schnell vorbei und nennen dir
            einen festen Preis vor Ort.
          </p>
          <p className="mt-4 text-sm text-text-secondary">
            Direkt:{" "}
            <a
              href={BW_BAUM_NOTFALL_TEL_HREF}
              className="font-semibold text-funnel-accent underline decoration-funnel-accent/40 underline-offset-2"
            >
              089 99733904
            </a>
          </p>
        </div>
      </StepWrapper>
    );
  }

  if (kind === "gefahrenabwehr") {
    return (
      <StepWrapper
        animateKey={`beratung-lead-gefahrenabwehr-${situation ?? ""}`}
        className="bw-beratung-lead"
      >
        <div className="step-wrapper">
          <p className="step-eyebrow">Baumarbeiten</p>
          <h1 className="step-question">Gefahrenabwehr</h1>
          <p className="step-sub whitespace-pre-line">
            Gefahrenabwehr ist sehr individuell — wir kommen schnell vorbei und
            beurteilen die Lage.
          </p>
          <p className="mt-4 text-sm text-text-secondary">
            Direkt:{" "}
            <a
              href={BW_BAUM_NOTFALL_TEL_HREF}
              className="font-semibold text-funnel-accent underline decoration-funnel-accent/40 underline-offset-2"
            >
              089 99733904
            </a>
          </p>
        </div>
      </StepWrapper>
    );
  }

  const eyebrow =
    kind === "schimmel"
      ? "Schimmel / Feuchtigkeit"
      : kind === "garten_planung" || kind === "garten_terrasse"
        ? "Gartengestaltung"
        : "Gewerbe";

  const headline =
    kind === "schimmel"
      ? "Schimmel braucht eine Vor-Ort-Analyse."
      : kind === "garten_planung"
        ? "Gartenplanung ist individuell"
        : kind === "garten_terrasse"
          ? "Terrasse & Material klären wir vor Ort"
          : "Gewerbliches Projekt?";

  const sub =
    kind === "schimmel"
      ? "Eine automatische Preisberechnung wäre hier nicht seriös — zu viel hängt von der Ursache ab. Wir schauen es uns an und melden uns persönlich."
      : kind === "garten_planung"
        ? "Gartenplanung ist individuell — wir kommen vorbei und schauen uns gemeinsam an was möglich ist und was es kostet."
        : kind === "garten_terrasse"
          ? "Wir melden uns für einen Beratungstermin — dann stimmen wir Fläche, Unterbau und Belag mit dir ab."
          : `Ob Büro, Praxis, Laden oder Gastronomie — wir planen individuell mit dir. Melde dich kurz und wir melden uns ${SITE_CONFIG.responseSlaWithin}.`;

  return (
    <StepWrapper
      animateKey={`beratung-lead-${kind}-${situation ?? ""}`}
      className="bw-beratung-lead"
    >
      <div className="step-wrapper">
        <p className="step-eyebrow">{eyebrow}</p>
        <h1 className="step-question">{headline}</h1>
        <p className="step-sub whitespace-pre-line">{sub}</p>

        <form id={formId} onSubmit={onSubmit} className="b2b-form space-y-3">
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

          <input
            type="tel"
            inputMode="tel"
            placeholder="+49 151 23456789"
            autoComplete="tel"
            className="funnel-input"
            value={telefon}
            onChange={(e) => onFieldChange("telefon", e.target.value)}
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
