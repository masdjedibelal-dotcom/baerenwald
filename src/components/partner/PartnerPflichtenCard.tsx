"use client";

import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { buildPartnerAuftragPflichten } from "@/lib/partner/partner-bauprojekt-pflichten";
import {
  buildBauauftragComplianceItems,
  isPartnerBauprojektAuftrag,
} from "@/lib/partner/compliance-summary";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export function PartnerPflichtenCard({
  compliance_stamm,
  compliance_projekt,
  compliance_bauauftrag,
  ist_bauprojekt,
  auftragId,
  titel = "Verbindlich annehmen",
  includeProjektvertrag = true,
  acknowledgment,
}: {
  compliance_stamm?: PartnerComplianceItem[];
  compliance_projekt?: PartnerComplianceItem[];
  compliance_bauauftrag?: PartnerComplianceItem[];
  ist_bauprojekt?: boolean;
  auftragId?: string | null;
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
  const showProjektvertrag = includeProjektvertrag && bauprojekt;
  const showPflichtenListe = bauprojekt || includeProjektvertrag === false;
  const nachweisCheckliste = bauprojekt
    ? buildBauauftragComplianceItems(
        compliance_stamm,
        compliance_projekt,
        compliance_bauauftrag
      )
    : [];
  const punkte = buildPartnerAuftragPflichten({
    ist_bauprojekt: bauprojekt,
    includeProjektvertrag: showProjektvertrag,
  });

  const checkboxLabel =
    acknowledgment?.label ??
    (showProjektvertrag
      ? "Ich habe die Pflichten gelesen und bestätige sie."
      : includeProjektvertrag === false
        ? "Ich bestätige die geänderten Leistungen und Pflichten verbindlich."
        : "Ich habe die Leistungen und Konditionen gelesen und nehme verbindlich an.");

  return (
    <>
      <section className="rounded-xl border border-border-light bg-muted/15 px-4 py-4">
        <h4 className="portal-text-section text-text-primary">{titel}</h4>
        <p className="portal-text-meta mt-1 text-text-secondary">
          {bauprojekt
            ? "Bauprojekt — bitte vor der Bestätigung durchlesen, was du erfüllen musst."
            : "Bitte Leistungen und Konditionen prüfen und verbindlich bestätigen."}
        </p>
        {showPflichtenListe && punkte.length > 0 ? (
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
        ) : null}
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

      {bauprojekt && nachweisCheckliste.length > 0 ? (
        <PartnerComplianceCheckliste
          title="Nachweise laut Projektvertrag (Anlage 1)"
          items={nachweisCheckliste}
          auftragId={auftragId}
          gruppiert
        />
      ) : null}
    </>
  );
}
