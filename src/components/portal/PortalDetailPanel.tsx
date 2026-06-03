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
import { SITE_CONFIG } from "@/lib/config";
import { fmtPortalMetaLine, portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
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
  const detailTitle = isAnfrageDetail
    ? anfrageDisplayTitle(item.anfrageVorhaben, item.anfrageGewerk)
    : item.title;

  const statusLabel = fmtPortalStatus(item.status || "offen");
  const metaLine = fmtPortalMetaLine({
    plz: item.plz ?? "—",
    ort: item.ort ?? "—",
    date: item.date,
  });

  const naechsterSchritt = item.sections.find((s) => s.heading === "Nächster Schritt")?.text;
  const infoHint = item.infoHint || naechsterSchritt;

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
      : !isAnfrageDetail && item.cardSubtitle
        ? item.cardSubtitle
        : undefined;

  return (
    <PortalDetailLayout>
      <PortalDetailHero
        title={detailTitle}
        metaLine={metaLine !== "—" ? metaLine : undefined}
        statusLabel={statusLabel}
        statusPillClass={portalDetailStatusPillClass(item.status || "offen")}
        subtitle={heroSubtitle}
      />

      {infoHint ? <PortalDetailInfoBox>{infoHint}</PortalDetailInfoBox> : null}

      {!isAnfrageDetail && item.summary ? (
        <p className="text-sm leading-relaxed text-text-secondary">{item.summary}</p>
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
            <p className="rounded-xl border border-border-light bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-text-primary">
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

      {item.betreuer ? (
        <PortalDetailSection title="Ansprechpartner">
          <PortalDetailKeyValues
            rows={[
              { label: "Name", value: item.betreuer.name },
              {
                label: "E-Mail",
                value: item.betreuer.email ? (
                  <a
                    href={`mailto:${item.betreuer.email}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {item.betreuer.email}
                  </a>
                ) : null,
              },
              {
                label: "Telefon",
                value: item.betreuer.phone ? (
                  <a
                    href={`tel:${item.betreuer.phone.replace(/\s/g, "")}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {item.betreuer.phone}
                  </a>
                ) : null,
              },
            ]}
          />
        </PortalDetailSection>
      ) : item.milestones !== undefined ? (
        <PortalDetailSection title="Ansprechpartner">
          <p className="text-sm text-text-secondary">
            Bei Fragen zu Ihrem Projekt erreichen Sie uns unter{" "}
            <a href={SITE_CONFIG.phoneHref} className="font-medium text-accent hover:underline">
              {SITE_CONFIG.phone}
            </a>{" "}
            oder{" "}
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="font-medium text-accent hover:underline"
            >
              {SITE_CONFIG.email}
            </a>
            .
          </p>
        </PortalDetailSection>
      ) : null}

      {!isAnfrageDetail && item.tags && item.tags.length > 0 ? (
        <PortalDetailSection title="Gewerke & Phasen">
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="tag tag-neutral">
                {tag}
              </span>
            ))}
          </div>
        </PortalDetailSection>
      ) : null}

      <DokumenteTabelle
        dokumente={portalDokumenteToZeilen(item.dokumente ?? [])}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

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
    </PortalDetailLayout>
  );
}
