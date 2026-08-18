"use client";

import { useState } from "react";

import { PARTNER_RAHMENVERTRAG_REGISTER_TEXT } from "@/lib/partner/partner-rahmenvertrag-text";
import { PortalDocOpenButton } from "@/components/shared/PortalDocOpenButton";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { cn } from "@/lib/utils";

export function PartnerRahmenvertragAcceptBlock({
  pdfUrl,
  vertragsNr,
  akzeptiert,
  onAkzeptiertChange,
  disabled = false,
  alreadyAcceptedAt,
  showCheckbox = true,
  error,
  variant = "default",
}: {
  pdfUrl?: string | null;
  vertragsNr?: string | null;
  akzeptiert: boolean;
  onAkzeptiertChange: (value: boolean) => void;
  disabled?: boolean;
  alreadyAcceptedAt?: string | null;
  showCheckbox?: boolean;
  error?: string | null;
  /** Weichere Begriffe während der Registrierung */
  variant?: "default" | "register";
}) {
  const [textOpen, setTextOpen] = useState(false);

  if (alreadyAcceptedAt && !showCheckbox) {
    return null;
  }

  const isRegister = variant === "register";
  const title = isRegister ? "Geschäftsbedingungen" : "Partnerschafts-Rahmenvertrag";
  const ariaLabel = isRegister ? "Geschäftsbedingungen" : "Vertragstext";
  const checkboxLabel = isRegister ? (
    <>
      Ich habe die <strong>Geschäftsbedingungen</strong> gelesen und akzeptiere sie — inklusive
      der Anlagen zu Datenschutz und Auftragsverarbeitung.
    </>
  ) : (
    <>
      Ich habe den Partnerschafts-Rahmenvertrag gelesen und akzeptiere ihn inklusive{" "}
      <strong>Anlage 1 (AVV)</strong> und <strong>Anlage 2</strong> (Unterauftragsverarbeiter /
      TOMs).
    </>
  );

  const contractText = (
    <pre className="portal-text-body whitespace-pre-wrap font-sans text-text-primary">
      {PARTNER_RAHMENVERTRAG_REGISTER_TEXT}
    </pre>
  );

  if (isRegister) {
    return (
      <div className="space-y-3">
        <div>
          <p className="portal-form-label">{title}</p>
          <button
            type="button"
            onClick={() => setTextOpen(true)}
            className="mt-1 portal-text-body font-medium text-accent underline-offset-2 hover:underline"
          >
            Partnerschafts-Rahmenvertrag anzeigen
          </button>
        </div>

        {showCheckbox ? (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border-light bg-muted/20 p-3",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <input
              type="checkbox"
              checked={akzeptiert}
              onChange={(e) => onAkzeptiertChange(e.target.checked)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#2E7D52]"
            />
            <span className="portal-text-body text-text-primary">{checkboxLabel}</span>
          </label>
        ) : null}

        {error ? <p className="portal-text-body text-red-700">{error}</p> : null}

        <PortalModalShell
          open={textOpen}
          onClose={() => setTextOpen(false)}
          title="Partnerschafts-Rahmenvertrag"
          variant="preview"
        >
          <div className="space-y-4">
            <div className="max-h-[min(60vh,28rem)] overflow-y-auto" aria-label={ariaLabel}>
              {contractText}
            </div>
            {pdfUrl ? (
              <PortalDocOpenButton
                href={pdfUrl}
                name="Partnerschafts-Rahmenvertrag"
                kind="pdf"
                className="btn-pill-outline portal-btn inline-flex"
              >
                PDF öffnen (inkl. Anlagen)
              </PortalDocOpenButton>
            ) : null}
          </div>
        </PortalModalShell>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="portal-form-label">{title}</p>
        <p className="portal-text-meta mt-0.5 text-text-secondary">
          Bitte durchscrollen, PDF bei Bedarf herunterladen und unten bestätigen.
          {vertragsNr ? ` Vertragsnr. ${vertragsNr}` : null}
        </p>
      </div>

      <div
        className="max-h-[220px] overflow-y-auto rounded-xl border border-border-default bg-surface-card px-3 py-3 sm:max-h-[280px]"
        tabIndex={0}
        aria-label={ariaLabel}
      >
        {contractText}
      </div>

      {pdfUrl ? (
        <PortalDocOpenButton
          href={pdfUrl}
          name="Partnerschafts-Rahmenvertrag"
          kind="pdf"
          className="btn-pill-outline portal-btn inline-flex"
        >
          PDF öffnen (inkl. Anlagen)
        </PortalDocOpenButton>
      ) : null}

      {showCheckbox ? (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border border-border-light bg-muted/20 p-3",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <input
            type="checkbox"
            checked={akzeptiert}
            onChange={(e) => onAkzeptiertChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#2E7D52]"
          />
          <span className="portal-text-body text-text-primary">{checkboxLabel}</span>
        </label>
      ) : null}

      {error ? <p className="portal-text-body text-red-700">{error}</p> : null}
    </div>
  );
}
