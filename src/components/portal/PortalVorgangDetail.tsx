"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { acceptKundeAngebot } from "@/app/actions/portal-angebot";
import { acceptKundeAuftragAenderungen } from "@/app/actions/portal-auftrag";
import { OrgAnlassBadge } from "@/components/org/OrgAnlassBadge";
import { OrganisationHvVorgangDetail } from "@/components/org/OrganisationHvVorgangDetail";
import { OrgVorgangFeedbackSection } from "@/components/org/OrgVorgangFeedbackSection";
import { OrgVorgangAbnahmeSection } from "@/components/org/OrgVorgangAbnahmeSection";
import { OrgMelderStatusLinkPanel } from "@/components/org/OrgMelderStatusLinkPanel";
import { VorgangTimeline } from "@/components/shared/VorgangTimeline";
import { PortalHvTerminSection } from "@/components/portal/PortalHvTerminSection";
import { PortalVorgangFeedbackSection } from "@/components/portal/PortalVorgangFeedbackSection";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalAuftragPhasenStrip } from "@/components/shared/PortalAuftragPhasenStrip";
import {
  PortalAnsprechpartnerCard,
  PortalConfirmDialog,
  PortalDetailError,
  PortalDetailHero,
  PortalDetailInfoBox,
  PortalDetailLayout,
  PortalDetailMilestoneList,
  PortalDetailStickyActions,
  PortalDetailSuccessBox,
} from "@/components/shared/PortalDetailUi";
import { kundePortalToast } from "@/lib/shared/portal-toast";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import { fmtPortalRelativeTime } from "@/lib/shared/portal-detail-format";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import {
  buildHvOffersFromItem,
  buildHvVerlaufSeed,
  inferFlowFromKundeItem,
} from "@/lib/portal2/hv-detail-adapters";
import { PORTAL_OBJEKT_COVER_DEFAULT_SRC } from "@/lib/portal2/portal-media";
import type { PortalMockStatusId } from "@/lib/portal2/status";

function sectionText(
  item: KundePortalDetailItem,
  headingRe: RegExp
): string {
  const s = item.sections.find((sec) => headingRe.test(sec.heading ?? ""));
  return (
    s?.text?.trim() ||
    s?.bullets?.join("\n").trim() ||
    s?.rows?.map((r) => `${r.label}: ${r.value}`).join("\n").trim() ||
    ""
  );
}

function extractMelderName(item: KundePortalDetailItem): string | undefined {
  const person = item.sections.find((s) =>
    /persönlich|kontakt|angaben/i.test(s.heading ?? "")
  );
  if (person?.rows?.length) {
    const vor = person.rows.find((r) => /vorname/i.test(r.label))?.value;
    const nach = person.rows.find((r) => /nachname/i.test(r.label))?.value;
    const name = [vor, nach].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  return item.ansprechpartner?.name?.trim() || undefined;
}

function extractObjektLine(item: KundePortalDetailItem): string {
  const objektSection = item.sections.find((s) =>
    /objekt|leistungsort/i.test(s.heading ?? "")
  );
  if (objektSection?.rows?.length) {
    const strasse = objektSection.rows.find((r) =>
      /straße|strasse|hausnummer/i.test(r.label)
    )?.value;
    const plz = objektSection.rows.find((r) => /plz/i.test(r.label))?.value;
    const ort = objektSection.rows.find((r) => /^ort$/i.test(r.label))?.value;
    const line = [strasse, [plz, ort].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    if (line) return line;
  }
  const fromMeta = item.cardMeta?.find((m) =>
    /\d{5}|str|weg|allee|platz/i.test(m.text)
  )?.text;
  if (fromMeta) return fromMeta;
  return [item.plz, item.ort].filter(Boolean).join(" ") || "Objekt";
}

export function PortalVorgangDetail({
  item,
  showAnlassBadge,
  onAccepted,
  hwErledigt,
  hvFeedback,
  onHvFeedbackSubmitted,
  auftragId,
  hvAbnahme,
  showHvAbnahme,
  orgFreigabeStatus,
  hvMeldungStatus,
  schwelleEur,
  onBack,
  privatkunde = false,
  flowStatusOverride,
}: {
  item: KundePortalDetailItem;
  showAnlassBadge?: boolean;
  onAccepted?: () => void;
  hwErledigt?: boolean;
  hvFeedback?: {
    bewertung?: { sterne: number; freitext?: string | null } | null;
    maengel?: Array<{ freitext?: string | null; created_at?: string }>;
  };
  onHvFeedbackSubmitted?: () => void;
  auftragId?: string;
  hvAbnahme?: {
    art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
    anmerkung?: string | null;
    signiert_name: string;
    signiert_am: string;
  } | null;
  showHvAbnahme?: boolean;
  /** D7: Privat/Gewerbe — kein Freigabe-Schritt, Hinweis „Automatisch freigegeben“ */
  privatkunde?: boolean;
  orgFreigabeStatus?: string | null;
  hvMeldungStatus?: string | null;
  schwelleEur?: number;
  onBack?: () => void;
  /** Kanonischer Flow aus CRM-Resolver (bevorzugt gegenüber Heuristik). */
  flowStatusOverride?: PortalMockStatusId;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const flowStatus = useMemo(
    () =>
      flowStatusOverride ??
      inferFlowFromKundeItem(item, {
        orgFreigabeStatus,
        hvMeldungStatus,
        hasRechnung: Boolean(
          item.dokumente?.some((d) => /rechnung/i.test(d.name ?? ""))
        ),
      }),
    [flowStatusOverride, item, orgFreigabeStatus, hvMeldungStatus]
  );

  if (showHvAbnahme) {
    const beschreibung =
      sectionText(item, /beschreibung|anliegen|nachricht|projekt/i) ||
      item.summary ||
      "";
    const objektRaw = extractObjektLine(item);
    const melder = extractMelderName(item);
    const rechnungPdf =
      item.dokumente?.find((d) => /rechnung/i.test(d.name ?? "") && d.href)
        ?.href ?? null;
    const kategorie =
      item.anfrageGewerk?.trim() ||
      item.cardSubtitle?.trim() ||
      undefined;

    return (
      <OrganisationHvVorgangDetail
        idLabel={(item.leadId ?? item.id).slice(0, 8).toUpperCase()}
        titel={item.title}
        objekt={String(objektRaw).slice(0, 160)}
        kategorie={kategorie}
        beschreibung={beschreibung}
        flowStatus={flowStatus}
        leadId={item.leadId ?? item.id}
        auftragId={auftragId}
        hvAbnahme={hvAbnahme}
        hwErledigt={hwErledigt}
        schwelleEur={schwelleEur}
        offers={buildHvOffersFromItem(item, item.ansprechpartner?.name)}
        positionenBrutto={item.angebotPositionen}
        gesamtBrutto={item.gesamtBrutto}
        rechnungPdfHref={rechnungPdf}
        bautagebuch={item.bautagebuch}
        verlauf={buildHvVerlaufSeed({
          createdAt: item.date,
          melder,
          freigabeStatus: orgFreigabeStatus,
          privatAuto: privatkunde,
        })}
        melder={melder}
        handwerkerName={item.ansprechpartner?.name}
        orgFreigabeStatus={orgFreigabeStatus}
        hvMeldungStatus={hvMeldungStatus}
        privatkunde={privatkunde}
        coverUrl={PORTAL_OBJEKT_COVER_DEFAULT_SRC}
        onBack={onBack}
        onUpdated={() => {
          onAccepted?.();
          onHvFeedbackSubmitted?.();
          router.refresh();
        }}
      />
    );
  }

  const rel = fmtPortalRelativeTime(item.date);
  const metaLine = rel ? `${rel}` : undefined;
  const statusPill = portalDetailStatusPillClass(item.statusPillKey ?? item.status ?? "offen");
  const hvTimeline =
    showHvAbnahme && item.isAuftragDetail
      ? [
          { id: "beauftragt", label: "Beauftragt", done: true, active: false },
          { id: "ausfuehrung", label: "Ausführung", done: true, active: false },
          {
            id: "abnahme",
            label: "Abnahme",
            done: Boolean(hvAbnahme && hvAbnahme.art !== "zurueckgewiesen"),
            active: !hvAbnahme || hvAbnahme.art === "zurueckgewiesen",
          },
          {
            id: "erledigt",
            label: "Erledigt",
            done: Boolean(hvAbnahme && hvAbnahme.art !== "zurueckgewiesen"),
            active: false,
          },
        ]
      : null;

  const abnahmeAbgeschlossen =
    hvAbnahme?.art === "ohne_vorbehalt" || hvAbnahme?.art === "mit_anmerkung";

  const isAngebotAccept = Boolean(item.isAngebotDetail && item.needsAction);
  const isAuftragAccept = Boolean(item.isAuftragDetail && item.needsAction);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const res = isAngebotAccept
      ? await acceptKundeAngebot(item.id)
      : isAuftragAccept
        ? await acceptKundeAuftragAenderungen(item.id)
        : { ok: false as const, error: "Keine Annahme möglich." };
    setLoading(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (isAuftragAccept) {
      kundePortalToast.aenderungenAngenommen();
    } else {
      kundePortalToast.angebotAngenommen();
    }
    setAccepted(true);
    onAccepted?.();
    router.refresh();
  }

  const showAcceptCta = (isAngebotAccept || isAuftragAccept) && !accepted;

  const footer = showAcceptCta ? (
    <PortalDetailStickyActions
      primaryLabel={isAuftragAccept ? "Änderungen annehmen" : "Angebot annehmen"}
      onPrimary={() => setConfirmOpen(true)}
      primaryLoading={loading}
    />
  ) : null;

  return (
    <>
      <PortalDetailLayout footer={footer}>
        <PortalDetailHero
          title={item.title}
          metaLine={metaLine}
          statusLabel={item.status}
          statusPillClass={statusPill}
        />

        {showAnlassBadge && item.anfrageVorhaben ? (
          <OrgAnlassBadge anlass={item.anfrageVorhaben} />
        ) : null}

        {accepted ? (
          <PortalDetailSuccessBox>
            <p className="font-semibold">
              {isAuftragAccept ? "Änderungen angenommen" : "Angebot angenommen"}
            </p>
            <p className="portal-text-meta mt-1">
              {isAuftragAccept
                ? "Danke — wir setzen die Anpassungen am Auftrag um."
                : "Wir bereiten den Auftrag vor und melden uns, sobald es weitergeht."}
            </p>
          </PortalDetailSuccessBox>
        ) : null}

        {error ? <PortalDetailError message={error} /> : null}

        {item.infoHint ? (
          <PortalDetailInfoBox>{item.infoHint}</PortalDetailInfoBox>
        ) : null}

        {item.isAuftragDetail && item.auftragPhasen && !item.hvMieterView ? (
          hvTimeline ? (
            <VorgangTimeline steps={hvTimeline} />
          ) : (
            <PortalAuftragPhasenStrip
              states={item.auftragPhasen.states}
              aktuellePhase={item.auftragPhasen.aktuellePhase}
              fortschritt={item.auftragPhasen.fortschritt ?? undefined}
            />
          )
        ) : null}

        {item.hvMieterView &&
        item.terminAuftragId &&
        item.terminSlots &&
        item.terminSlots.length > 0 ? (
          <PortalHvTerminSection
            auftragId={item.terminAuftragId}
            slots={item.terminSlots}
          />
        ) : null}

        {item.melderStatusUrl && !item.hvMieterView ? (
          <OrgMelderStatusLinkPanel statusUrl={item.melderStatusUrl} />
        ) : null}

        {!item.hvMieterView ? (
          <PartnerPortalDetailSections
            sections={item.sections}
            angebotPositionen={item.angebotPositionen}
            auftragPositionen={item.auftragPositionen}
            gesamtBrutto={item.gesamtBrutto}
            hidePreise={item.hidePreise}
          />
        ) : (
          <PartnerPortalDetailSections sections={item.sections} />
        )}

        {item.milestones && item.milestones.length > 0 ? (
          <PortalDetailMilestoneList items={item.milestones} />
        ) : null}

        {item.bautagebuch && item.bautagebuch.length > 0 ? (
          <BautagebuchAccordionList
            eintraege={item.bautagebuch.map((b) => ({
              id: b.id ?? `${b.datum}-${b.titel}`,
              datum: b.datum ?? b.created_at,
              titel: b.titel ?? "Eintrag",
              beschreibung: b.notiz,
              fotos: b.fotos_urls,
            }))}
          />
        ) : null}

        {item.ansprechpartner ? (
          <PortalAnsprechpartnerCard
            rolleLabel={item.ansprechpartner.rolleLabel}
            name={item.ansprechpartner.name}
            telefon={item.ansprechpartner.telefon}
            telefonHref={item.ansprechpartner.telefonHref}
            intro={item.ansprechpartner.intro}
          />
        ) : null}

        {item.dokumente && item.dokumente.length > 0 ? (
          <DokumenteTabelle
            heading={item.feedbackBereit ? "Anhänge" : "Dokumente"}
            dokumente={item.dokumente.map((d) => ({
              id: d.id,
              name: d.name,
              datum: d.datum,
              href: d.href,
            }))}
          />
        ) : null}

        {item.leadId ? (
          showAnlassBadge ? (
            <>
              {showHvAbnahme && hwErledigt && auftragId ? (
                <OrgVorgangAbnahmeSection
                  leadId={item.leadId}
                  auftragId={auftragId}
                  existing={hvAbnahme ?? null}
                  onSubmitted={onHvFeedbackSubmitted}
                />
              ) : null}
              {(abnahmeAbgeschlossen || !hwErledigt) && (
                <OrgVorgangFeedbackSection
                  leadId={item.leadId}
                  feedbackBereit={item.feedbackBereit && (abnahmeAbgeschlossen || !showHvAbnahme)}
                  handwerkerErledigt={hwErledigt}
                  hvFeedback={hvFeedback}
                  onSubmitted={onHvFeedbackSubmitted}
                />
              )}
            </>
          ) : (
            <PortalVorgangFeedbackSection
              leadId={item.leadId}
              feedbackBereit={item.feedbackBereit}
              mieterFeedback={item.mieterFeedback}
            />
          )
        ) : null}
      </PortalDetailLayout>

      <PortalConfirmDialog
        open={confirmOpen}
        title={isAuftragAccept ? "Änderungen am Auftrag annehmen?" : "Angebot annehmen?"}
        description={
          isAuftragAccept
            ? item.hidePreise
              ? "Mit der Annahme bestätigst du die geänderten Leistungen am laufenden Auftrag verbindlich."
              : "Mit der Annahme bestätigst du die geänderten Leistungen und Preise am laufenden Auftrag verbindlich."
            : item.hidePreise
              ? "Mit der Annahme beauftragst du Bärenwald verbindlich mit der Ausführung. Wir melden uns zur weiteren Planung."
              : "Mit der Annahme beauftragst du Bärenwald verbindlich mit der Ausführung zu den genannten Konditionen. Wir melden uns zur weiteren Planung."
        }
        confirmLabel="Verbindlich annehmen"
        loading={loading}
        onConfirm={handleAccept}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
