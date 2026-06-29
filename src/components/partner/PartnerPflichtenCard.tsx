"use client";

import { buildPartnerAuftragPflichten } from "@/lib/partner/partner-bauprojekt-pflichten";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export function PartnerPflichtenCard({
  compliance_projekt,
  ist_bauprojekt,
  titel = "Deine Pflichten",
  includeProjektvertrag = true,
  acknowledgment,
}: {
  compliance_projekt?: PartnerComplianceItem[];
  ist_bauprojekt?: boolean;
  titel?: string;
  includeProjektvertrag?: boolean;
  acknowledgment?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
  };
}) {
  const bauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt,
    compliance_projekt,
  });
  const punkte = buildPartnerAuftragPflichten({
    compliance_projekt,
    ist_bauprojekt: bauprojekt,
    includeProjektvertrag,
  });

  const checkboxLabel =
    acknowledgment?.label ??
    (includeProjektvertrag
      ? "Ich habe die Pflichten gelesen und bestätige sie."
      : "Ich bestätige die geänderten Leistungen und Pflichten verbindlich.");

  return (
    <section className="rounded-xl border border-border-light bg-muted/15 px-4 py-4">
      <h4 className="portal-text-section text-text-primary">{titel}</h4>
      <p className="portal-text-meta mt-1 text-text-secondary">
        {bauprojekt
          ? "Bauprojekt — bitte vor der Bestätigung durchlesen, was du erfüllen musst."
          : "Normaler Auftrag — bitte vor der Bestätigung durchlesen, was du erfüllen musst."}
      </p>
      <ul className="mt-3 space-y-2">
        {punkte.map((text) => (
          <li
            key={text}
            className="portal-text-body flex gap-2 text-text-primary before:shrink-0 before:content-['•']"
          >
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {acknowledgment ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-border-light pt-4">
          <input
            type="checkbox"
            checked={acknowledgment.checked}
            onChange={(e) => acknowledgment.onChange(e.target.checked)}
            className="mt-1"
          />
          <span className="portal-text-body text-text-primary">{checkboxLabel}</span>
        </label>
      ) : null}
    </section>
  );
}
