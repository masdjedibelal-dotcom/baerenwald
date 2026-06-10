"use client";

import { useEffect, useRef, useState } from "react";

import type { GptLeadDraft } from "@/lib/gpt-viz/lead-collect";
import { scrollGuidedBlockIntoView } from "@/lib/gpt-viz/scroll-guided-into-view";
import { cn } from "@/lib/utils";

type ChatLeadFormProps = {
  prefillPlz?: string;
  projectSummary?: { label: string; value: string }[];
  disabled?: boolean;
  onSubmit: (draft: GptLeadDraft) => void;
  className?: string;
};

export function ChatLeadForm({
  prefillPlz,
  projectSummary,
  disabled,
  onSubmit,
  className,
}: ChatLeadFormProps) {
  const [name, setName] = useState("");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState(prefillPlz ?? "");
  const [kontakt, setKontakt] = useState("");
  const [notizen, setNotizen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    scrollGuidedBlockIntoView(rootRef.current);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bitte deinen Namen eintragen.");
      return;
    }
    if (!strasse.trim()) {
      setError("Bitte Straße und Hausnummer eintragen.");
      return;
    }
    if (plz.replace(/\D/g, "").length !== 5) {
      setError("Bitte eine gültige PLZ (5 Ziffern) eintragen.");
      return;
    }
    if (!kontakt.trim()) {
      setError("Bitte E-Mail oder Telefonnummer eintragen.");
      return;
    }

    const m = strasse.trim().match(/^(.+?)\s+(\d+\s*[a-zA-Z]?)$/);
    const draft: GptLeadDraft = {
      name: name.trim(),
      strasse: m ? m[1].trim() : strasse.trim(),
      hausnummer: m ? m[2].trim() : undefined,
      plz: plz.replace(/\D/g, "").slice(0, 5),
      notizen: notizen.trim() || undefined,
      notizen_bekannt: true,
    };

    if (kontakt.includes("@")) {
      draft.email = kontakt.trim().toLowerCase();
    } else {
      draft.telefon = kontakt.trim();
    }

    setError(null);
    onSubmit(draft);
  };

  return (
    <form
      ref={rootRef}
      className={cn("gpt-guided-lead-form", className)}
      onSubmit={handleSubmit}
    >
      {projectSummary && projectSummary.length > 0 ? (
        <div className="gpt-guided-lead-summary">
          {projectSummary.map((item) => (
            <span key={item.label} className="gpt-guided-summary-chip">
              <strong>{item.label}</strong> {item.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="gpt-guided-lead-fields">
        <label className="gpt-guided-lead-field">
          <span>Name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            disabled={disabled}
            placeholder="Max Mustermann"
            onChange={(e) => setName(e.target.value)}
            onFocus={() => scrollGuidedBlockIntoView(rootRef.current)}
          />
        </label>

        <label className="gpt-guided-lead-field">
          <span>Straße & Hausnummer</span>
          <input
            type="text"
            autoComplete="street-address"
            value={strasse}
            disabled={disabled}
            placeholder="Musterstraße 12"
            onChange={(e) => setStrasse(e.target.value)}
          />
        </label>

        <div className="gpt-guided-lead-row">
          <label className="gpt-guided-lead-field gpt-guided-lead-field--plz">
            <span>PLZ</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={plz}
              disabled={disabled}
              placeholder="80331"
              onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
            />
          </label>

          <label className="gpt-guided-lead-field gpt-guided-lead-field--grow">
            <span>E-Mail oder Telefon</span>
            <input
              type="text"
              autoComplete="email tel"
              value={kontakt}
              disabled={disabled}
              placeholder="kontakt@beispiel.de"
              onChange={(e) => setKontakt(e.target.value)}
            />
          </label>
        </div>

        <label className="gpt-guided-lead-field">
          <span>Anmerkung <em className="gpt-guided-lead-optional">optional</em></span>
          <textarea
            rows={2}
            value={notizen}
            disabled={disabled}
            placeholder="Kurz zum Projekt …"
            onChange={(e) => setNotizen(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="gpt-guided-lead-error" role="alert">{error}</p> : null}

      <button type="submit" className="gpt-guided-primary-btn" disabled={disabled}>
        Anfrage absenden
      </button>
    </form>
  );
}
