"use client";

import { buildPartnerAuftragPflichten } from "@/lib/partner/partner-bauprojekt-pflichten";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export function PartnerPflichtenCard({
  compliance_projekt,
  ist_bauprojekt,
  titel = "Deine Pflichten",
}: {
  compliance_projekt?: PartnerComplianceItem[];
  ist_bauprojekt?: boolean;
  titel?: string;
}) {
  const bauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt,
    compliance_projekt,
  });
  const punkte = buildPartnerAuftragPflichten({ compliance_projekt, ist_bauprojekt: bauprojekt });

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
    </section>
  );
}
