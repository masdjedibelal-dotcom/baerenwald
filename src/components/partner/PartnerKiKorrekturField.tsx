"use client";

import { useEffect, useState } from "react";

import { PortalKiAssistField } from "@/components/shared/PortalKiAssistField";
import { cn } from "@/lib/utils";

type Scope = "bautagebuch" | "abnahmeprotokoll";

type Props = {
  scope: Scope;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  leistungName?: string | null;
  auftragTitel?: string | null;
  /** Rohtext für Form-Submit (hidden) — Name default beschreibung_roh */
  rohName?: string;
};

/**
 * Handwerker-Textfeld: KI-Chat mit Übernehmen.
 * Sprachnotiz nur noch in Bärenwald GPT (Chat-Composer).
 */
export function PartnerKiKorrekturField({
  scope,
  name = "beschreibung",
  value,
  onChange,
  rows = 3,
  required,
  placeholder,
  label = "Beschreibung",
  className,
  leistungName,
  auftragTitel,
  rohName = "beschreibung_roh",
}: Props) {
  const [roh, setRoh] = useState(value);

  useEffect(() => {
    if (!roh || roh === value) setRoh(value);
    // Nur bei externem Value-Sync; roh selbst nicht als Dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onTextChange(next: string) {
    onChange(next);
    if (!roh || roh === value) setRoh(next);
  }

  function onApply(text: string) {
    if (!roh.trim()) setRoh(value.trim() || text);
    onChange(text);
  }

  const contextHint = [
    auftragTitel?.trim() ? `Auftrag: ${auftragTitel.trim()}` : null,
    leistungName?.trim() ? `Leistung: ${leistungName.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className={cn("space-y-1.5", className)}>
      <PortalKiAssistField
        scope={scope}
        label={label}
        value={value}
        onApply={onApply}
        contextHint={contextHint || null}
        required={required}
      >
        <textarea
          name={name}
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={placeholder}
          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
        />
      </PortalKiAssistField>
      <input type="hidden" name={rohName} value={roh || value} />
    </div>
  );
}
