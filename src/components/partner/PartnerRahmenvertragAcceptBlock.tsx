"use client";

import { PARTNER_RAHMENVERTRAG_REGISTER_TEXT } from "@/lib/partner/partner-rahmenvertrag-text";
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
}: {
  pdfUrl?: string | null;
  vertragsNr?: string | null;
  akzeptiert: boolean;
  onAkzeptiertChange: (value: boolean) => void;
  disabled?: boolean;
  alreadyAcceptedAt?: string | null;
  showCheckbox?: boolean;
  error?: string | null;
}) {
  if (alreadyAcceptedAt && !showCheckbox) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="portal-form-label">Partnerschafts-Rahmenvertrag</p>
        <p className="portal-text-meta mt-0.5 text-text-secondary">
          Bitte durchscrollen, PDF bei Bedarf herunterladen und unten bestätigen.
          {vertragsNr ? ` Vertragsnr. ${vertragsNr}` : ""}
        </p>
      </div>

      <div
        className="max-h-[220px] overflow-y-auto rounded-xl border border-border-default bg-surface-card px-3 py-3 sm:max-h-[280px]"
        tabIndex={0}
        aria-label="Vertragstext"
      >
        <pre className="portal-text-body whitespace-pre-wrap font-sans text-text-primary">
          {PARTNER_RAHMENVERTRAG_REGISTER_TEXT}
        </pre>
      </div>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill-outline portal-btn inline-flex !px-4 !py-2.5"
        >
          PDF herunterladen (inkl. Anlagen)
        </a>
      ) : (
        <p className="portal-text-meta text-text-tertiary">
          Dein personalisiertes PDF stellt Bärenwald bereit, sobald der Rahmenvertrag im
          CRM erzeugt wurde. Der obige Text gilt als Grundlage der Annahme.
        </p>
      )}

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
          <span className="portal-text-body text-text-primary">
            Ich habe den Partnerschafts-Rahmenvertrag gelesen und akzeptiere ihn inklusive{" "}
            <strong>Anlage 1 (AVV)</strong> und <strong>Anlage 2</strong>{" "}
            (Unterauftragsverarbeiter / TOMs).
          </span>
        </label>
      ) : null}

      {error ? <p className="portal-text-body text-red-700">{error}</p> : null}
    </div>
  );
}
