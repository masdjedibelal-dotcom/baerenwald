"use client";

import {
  PartnerDetailKeyValues,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
import {
  PortalDetailLeistungenPreisListe,
} from "@/components/shared/PortalDetailUi";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalDetailSection } from "@/lib/portal/portal-display";

export function PartnerPortalDetailSections({
  sections,
  angebotPositionen,
  gesamtBrutto,
  gesamtLabel,
}: {
  sections: PortalDetailSection[];
  angebotPositionen?: PortalAngebotPositionDisplay[];
  gesamtBrutto?: number;
  gesamtLabel?: string;
}) {
  const visible = sections.filter(
    (section) =>
      (section.rows && section.rows.length > 0) ||
      (section.bullets && section.bullets.length > 0) ||
      Boolean(section.text)
  );

  return (
    <>
      {visible.map((section) => (
        <PartnerDetailSection key={section.heading} title={section.heading}>
          {section.rows && section.rows.length > 0 ? (
            <PartnerDetailKeyValues
              rows={section.rows.map((row) => ({
                label: row.label,
                value: row.value,
              }))}
            />
          ) : null}
          {section.bullets && section.bullets.length > 0 ? (
            <PartnerDetailLeistungenList
              items={section.bullets.map((line, i) => ({
                id: `${section.heading}-${i}`,
                title: line,
              }))}
            />
          ) : null}
          {section.text ? (
            <p className="portal-text-body rounded-xl border border-border-light bg-muted/20 px-3 py-3 text-text-primary">
              {section.text}
            </p>
          ) : null}
        </PartnerDetailSection>
      ))}

      {angebotPositionen && angebotPositionen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PortalDetailLeistungenPreisListe
            items={angebotPositionen}
            gesamtBrutto={gesamtBrutto}
            gesamtLabel={gesamtLabel ?? "Gesamtpreis Brutto inkl. MwSt."}
          />
        </PartnerDetailSection>
      ) : null}
    </>
  );
}
