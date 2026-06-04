"use client";

import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import {
  DokumenteTabelle,
  portalDokumenteToZeilen,
} from "@/components/shared/DokumenteTabelle";
import {
  PortalDetailHero,
  PortalDetailInfoBox,
  PortalDetailKeyValues,
  PortalDetailLayout,
  PortalDetailLeistungenList,
  PortalDetailMilestoneList,
  PortalDetailSection,
} from "@/components/shared/PortalDetailUi";
import { fmtPortalMetaLine, fmtPortalRelativeTime, portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { fmtPortalStatus } from "@/lib/portal/portal-display";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";

function anfrageDisplayTitle(vorhaben?: string, gewerk?: string): string {
  const v = vorhaben?.trim();
  const g = gewerk?.trim();
  if (v && g) return `${v} · ${g}`;
  return v || g || "Anfrage";
}

const ANFRAGE_DUPLICATE_HEADINGS = new Set([
  "Gewerke",
  "Ihr Vorhaben",
  "Gewerk",
  "Vorhaben",
]);

const SKIP_IN_DETAIL = new Set(["Nächster Schritt"]);

export function PortalDetailPanel({ item }: { item: KundePortalDetailItem }) {
  const isAnfrageDetail = Boolean(item.anfrageGewerk || item.anfrageVorhaben);
  const isAuftragDetail = item.bautagebuch !== undefined;
  const detailTitle = isAnfrageDetail
    ? anfrageDisplayTitle(item.anfrageVorhaben, item.anfrageGewerk)
    : item.title;

  const statusLabel = fmtPortalStatus(item.status || "offen");
  const metaLine = item.suppressLocationInHero
    ? fmtPortalRelativeTime(item.date) ?? undefined
    : (() => {
        const line = fmtPortalMetaLine({
          plz: item.plz ?? "—",
          ort: item.ort ?? "—",
          date: item.date,
        });
        return line !== "—" ? line : undefined;
      })();

  const infoHint = isAuftragDetail ? undefined : item.infoHint;

  const visibleSections = item.sections
    .filter(
      (section) =>
        (section.rows && section.rows.length > 0) ||
        (section.bullets && section.bullets.length > 0) ||
        Boolean(section.text)
    )
    .filter((section) => !SKIP_IN_DETAIL.has(section.heading))
    .filter((section) => {
      if (!isAnfrageDetail) return true;
      return !ANFRAGE_DUPLICATE_HEADINGS.has(section.heading);
    });

  const heroSubtitle =
    isAnfrageDetail && item.anfrageGewerk && detailTitle !== item.anfrageGewerk
      ? item.anfrageGewerk
      : !isAnfrageDetail &&
          !isAuftragDetail &&
          item.cardSubtitle &&
          !item.suppressLocationInHero
        ? item.cardSubtitle
        : undefined;

  return (
    <PortalDetailLayout>
      <PortalDetailHero
        title={detailTitle}
        metaLine={metaLine}
        statusLabel={statusLabel}
        statusPillClass={portalDetailStatusPillClass(item.status || "offen")}
        subtitle={heroSubtitle}
      />

      {infoHint ? <PortalDetailInfoBox>{infoHint}</PortalDetailInfoBox> : null}

      {!isAnfrageDetail && !isAuftragDetail && item.summary && !item.suppressLocationInHero ? (
        <p className="portal-text-body text-text-secondary">{item.summary}</p>
      ) : null}

      {visibleSections.map((section) => (
        <PortalDetailSection key={section.heading} title={section.heading}>
          {section.rows && section.rows.length > 0 ? (
            <PortalDetailKeyValues
              rows={section.rows.map((row) => ({
                label: row.label,
                value: row.value,
              }))}
            />
          ) : null}
          {section.bullets && section.bullets.length > 0 ? (
            <PortalDetailLeistungenList
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
        </PortalDetailSection>
      ))}

      {item.milestones && item.milestones.length > 0 ? (
        <PortalDetailSection title="Meilensteine">
          <PortalDetailMilestoneList items={item.milestones} />
        </PortalDetailSection>
      ) : null}

      {item.bautagebuch !== undefined ? (
        <BautagebuchAccordionList
          eintraege={(item.bautagebuch ?? []).map((e) => ({
            id: e.id ?? `${e.titel}-${e.datum}`,
            datum: e.datum ?? e.created_at,
            titel: e.titel ?? "Update",
            beschreibung: e.notiz,
            fotos: e.fotos_urls,
          }))}
          className="!border-t-0 !pt-0"
          emptyText="Noch keine Einträge im Bautagebuch."
        />
      ) : null}

      <DokumenteTabelle
        dokumente={portalDokumenteToZeilen(item.dokumente ?? [])}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />
    </PortalDetailLayout>
  );
}
