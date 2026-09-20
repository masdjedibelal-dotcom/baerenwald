"use client";

import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { buildPartnerAuftragPflichten } from "@/lib/partner/partner-bauprojekt-pflichten";
import {
  buildBauauftragComplianceItems,
  isPartnerBauprojektAuftrag,
} from "@/lib/partner/compliance-summary";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

import { PortalCheckbox } from "@/components/shared/PortalFormControls";
import { cn } from "@/lib/utils";
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
    /** Kurz hervorheben (Sprung von Annehmen-Button). */
    highlight?: boolean;
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
      <PortalDetailCard title={titel} chrome="responsive">
        <p className="text-fs-meta text-text-secondary">
          {bauprojekt
            ? "Bauprojekt — bitte vor der Bestätigung durchlesen, was Sie erfüllen müssen."
            : "Bitte Leistungen und Konditionen prüfen und verbindlich bestätigen."}
        </p>
        {showPflichtenListe && punkte.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {punkte.map((text) => (
              <li
                key={text}
                className="flex gap-2 text-fs-meta text-text-primary before:shrink-0 before:content-['•']"
              >
                <span>{text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {acknowledgment ? (
          <label
            id="partner-pflichten-ack"
            className={cn(
              "mt-4 flex cursor-pointer items-start gap-3 border-t border-border-light pt-4 rounded-field transition-[box-shadow,background-color]",
              acknowledgment.highlight && "partner-pflichten-ack--pulse"
            )}
          >
            <PortalCheckbox
              checked={acknowledgment.checked}
              onChange={(e) => acknowledgment.onChange(e.target.checked)}
              className="mt-1"
            />
            <span className="text-fs-meta text-text-primary">{checkboxLabel}</span>
          </label>
        ) : null}
      </PortalDetailCard>

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
