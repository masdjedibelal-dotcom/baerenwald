"use client";

import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import {
  DokumenteTabelle,
  portalDokumenteToZeilen,
} from "@/components/shared/DokumenteTabelle";
import {
  PortalAnsprechpartnerCard,
  PortalDetailHero,
  PortalDetailInfoBox,
  PortalDetailKeyValues,
  PortalDetailLayout,
  PortalDetailLeistungenList,
  PortalDetailLeistungenPreisListe,
  PortalDetailMilestoneList,
  PortalDetailSection,
} from "@/components/shared/PortalDetailUi";
import {
  fmtPortalDate,
  fmtPortalMetaLine,
  fmtPortalRelativeTime,
  portalDetailStatusPillClass,
} from "@/lib/shared/portal-detail-format";
import { formatAuftragDatumSpan } from "@/lib/portal/portal-auftrag-display";
import { fmtPortalAuftragStatus, fmtPortalStatus } from "@/lib/portal/portal-display";
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
  const isAngebotDetail = Boolean(item.isAngebotDetail);
  const isAuftragDetail = Boolean(item.isAuftragDetail);
  const detailTitle = isAnfrageDetail
    ? anfrageDisplayTitle(item.anfrageVorhaben, item.anfrageGewerk)
    : item.title;

  const statusLabel =
    isAnfrageDetail && !item.vorgangPhase
      ? item.status
      : isAnfrageDetail
        ? item.status
        : isAuftragDetail
      ? fmtPortalAuftragStatus(item.status || "offen")
      : fmtPortalStatus(item.status || "offen");
  const metaLine =
    isAnfrageDetail || isAngebotDetail
      ? (() => {
          const date = fmtPortalDate(item.date);
          const rel = fmtPortalRelativeTime(item.date);
          const parts = [date !== "—" ? date : null, rel].filter(Boolean);
          return parts.length ? parts.join(" · ") : undefined;
        })()
      : isAuftragDetail
        ? formatAuftragDatumSpan(item.date, item.auftragEndDatum)
        : item.suppressLocationInHero
      ? fmtPortalRelativeTime(item.date) ?? undefined
      : (() => {
          const line = fmtPortalMetaLine({
            plz: item.plz ?? "—",
            ort: item.ort ?? "—",
            date: item.date,
          });
          return line !== "—" ? line : undefined;
        })();

  const infoHint =
    isAuftragDetail || isAnfrageDetail || isAngebotDetail ? undefined : item.infoHint;

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
    isAnfrageDetail
      ? undefined
      : !isAuftragDetail &&
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
        statusPillClass={
          statusLabel
            ? portalDetailStatusPillClass(
                item.statusPillKey || item.status || "offen"
              )
            : undefined
        }
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

      {isAngebotDetail && item.angebotPositionen && item.angebotPositionen.length > 0 ? (
        <PortalDetailSection title="Leistungen">
          <PortalDetailLeistungenPreisListe
            items={item.angebotPositionen}
            gesamtBrutto={item.gesamtBrutto}
          />
        </PortalDetailSection>
      ) : null}

      {!isAuftragDetail && item.milestones && item.milestones.length > 0 ? (
        <PortalDetailSection title="Meilensteine">
          <PortalDetailMilestoneList items={item.milestones} />
        </PortalDetailSection>
      ) : null}

      {isAuftragDetail && item.bautagebuch !== undefined ? (
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
        heading={isAuftragDetail ? "Dokumentation" : "Dokumente"}
        emptyText={
          isAuftragDetail
            ? "Noch keine Dokumentation."
            : "Noch keine Dokumente."
        }
        className="!border-t-0 !pt-0"
      />

      {isAuftragDetail && item.ansprechpartner ? (
        <PortalAnsprechpartnerCard
          rolleLabel={item.ansprechpartner.rolleLabel}
          name={item.ansprechpartner.name}
          telefon={item.ansprechpartner.telefon}
          telefonHref={item.ansprechpartner.telefonHref}
          intro={item.ansprechpartner.intro}
        />
      ) : null}
    </PortalDetailLayout>
  );
}
