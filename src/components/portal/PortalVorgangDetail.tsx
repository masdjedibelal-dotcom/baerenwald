"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { acceptKundeAngebot, rejectKundeAngebot } from "@/app/actions/portal-angebot";
import { acceptKundeAuftragAenderungen } from "@/app/actions/portal-auftrag";
import { OrgAnlassBadge } from "@/components/org/OrgAnlassBadge";
import { OrganisationHvVorgangDetail } from "@/components/org/OrganisationHvVorgangDetail";
import { OrgVorgangFeedbackSection } from "@/components/org/OrgVorgangFeedbackSection";
import { OrgMelderStatusLinkPanel } from "@/components/org/OrgMelderStatusLinkPanel";
import { PortalHvTerminSection } from "@/components/portal/PortalHvTerminSection";
import { PortalVorgangFeedbackSection } from "@/components/portal/PortalVorgangFeedbackSection";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalDetailTabs } from "@/components/shared/PortalDetailTabs";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
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
import {
  normalizePortalDeepLinkTab,
  portalDeepLinkTabForSimpleNav,
  PORTAL_DETAIL_TAB_QUERY,
} from "@/lib/portal2/portal-detail-deep-link";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import { portalMieterStatusLabel } from "@/lib/portal2/status";

function extractProjektbeschreibung(item: KundePortalDetailItem): string {
  for (const sec of item.sections ?? []) {
    const row = sec.rows?.find((r) =>
      /projektbeschreibung|beschreibung|anliegen|nachricht/i.test(r.label ?? "")
    );
    if (row?.value?.trim()) return row.value.trim();
  }
  return item.summary?.trim() || "";
}

function extractMelderName(item: KundePortalDetailItem): string | undefined {
  const fromLead = item.melderName?.trim();
  if (fromLead) return fromLead;
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
  freigabeBypassGrund,
  hvMeldungStatus,
  schwelleEur,
  onBack,
  privatkunde = false,
  flowStatusOverride,
  mieterStatusMode = false,
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
  freigabeBypassGrund?: "schwelle" | "akut" | null;
  hvMeldungStatus?: string | null;
  schwelleEur?: number;
  onBack?: () => void;
  /** Kanonischer Flow aus CRM-Resolver (bevorzugt gegenüber Heuristik). */
  flowStatusOverride?: PortalMockStatusId;
  /** Mieter (HV-Lead): Status ohne Angebots-/Handwerker-Wording. */
  mieterStatusMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectGrund, setRejectGrund] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "details" | "bautagebuch" | "dokumente" | "feedback"
  >("details");

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

  const showBautagebuchTab = Boolean(
    item.bautagebuch && item.bautagebuch.length > 0 && !item.hvMieterView
  );
  const showFeedbackTab = Boolean(item.leadId);

  const sectionTabs = useMemo(
    () => [
      { id: "details" as const, label: "Details" },
      ...(showBautagebuchTab
        ? [{ id: "bautagebuch" as const, label: "Dokumentation" }]
        : []),
      { id: "dokumente" as const, label: "Dokumente" },
      ...(showFeedbackTab
        ? [{ id: "feedback" as const, label: "Feedback" }]
        : []),
    ],
    [showBautagebuchTab, showFeedbackTab]
  );

  useEffect(() => {
    if (!sectionTabs.some((t) => t.id === activeSection)) {
      setActiveSection(sectionTabs[0]?.id ?? "details");
    }
  }, [sectionTabs, activeSection]);

  useEffect(() => {
    deepLinkAppliedRef.current = false;
  }, [item.id, item.leadId]);

  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const fromQuery = normalizePortalDeepLinkTab(
      searchParams.get(PORTAL_DETAIL_TAB_QUERY)
    );
    const fromHash =
      typeof window !== "undefined"
        ? normalizePortalDeepLinkTab(window.location.hash)
        : null;
    const tab = fromQuery || fromHash;
    if (!tab) return;
    const target = portalDeepLinkTabForSimpleNav(tab);
    if (!sectionTabs.some((t) => t.id === target)) return;
    setActiveSection(target);
    deepLinkAppliedRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(PORTAL_DETAIL_TAB_QUERY);
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } catch {
      /* ignore */
    }
  }, [sectionTabs, searchParams, item.id, item.leadId]);

  if (showHvAbnahme) {
    const beschreibung = extractProjektbeschreibung(item);
    const objektRaw = extractObjektLine(item);
    const melder = extractMelderName(item);
    const rechnungPdf =
      item.dokumente?.find((d) => /rechnung/i.test(d.name ?? "") && d.href)
        ?.href ?? null;
    return (
      <OrganisationHvVorgangDetail
        idLabel=""
        titel={item.title}
        objekt={String(objektRaw).slice(0, 160)}
        kategorie={undefined}
        beschreibung={beschreibung}
        flowStatus={flowStatus}
        leadId={item.leadId ?? item.id}
        auftragId={auftragId ?? item.terminAuftragId}
        hvAbnahme={hvAbnahme}
        hwErledigt={hwErledigt}
        schwelleEur={schwelleEur}
        offers={buildHvOffersFromItem(item, item.ansprechpartner?.name)}
        positionenBrutto={item.auftragPositionen ?? item.angebotPositionen}
        gesamtBrutto={item.gesamtBrutto}
        rechnungPdfHref={rechnungPdf}
        bautagebuch={item.hvMieterView ? undefined : item.bautagebuch}
        dokumente={item.dokumente ?? []}
        abnahmeCheckliste={item.abnahmeCheckliste ?? null}
        verlauf={buildHvVerlaufSeed({
          createdAt: item.date,
          melder,
          freigabeStatus: orgFreigabeStatus,
          privatAuto: privatkunde,
        })}
        melder={melder}
        melderEinheit={item.melderEinheit}
        melderTelefon={item.melderTelefon}
        melderEmail={item.melderEmail}
        kostentraeger={item.kostentraeger}
        kostentraegerVorgeschlagen={item.kostentraegerVorgeschlagen}
        versicherungsNr={item.versicherungsNr}
        meldeFotos={item.meldeFotos}
        meldeStrasse={item.meldeStrasse}
        meldePlz={item.meldePlz}
        meldeOrt={item.meldeOrt}
        meldeSituation={item.meldeSituation}
        meldeBereich={item.meldeBereich}
        meldeZeitraum={item.meldeZeitraum}
        meldeFachdetails={item.meldeFachdetails}
        meldePreisIndikation={item.meldePreisIndikation}
        handwerkerName={item.ansprechpartner?.name}
        terminVon={item.isAuftragDetail ? item.date : null}
        terminBis={item.auftragEndDatum ?? null}
        terminSlots={item.terminSlots}
        orgFreigabeStatus={orgFreigabeStatus ?? item.orgFreigabeStatus}
        freigabeBypassGrund={
          freigabeBypassGrund ??
          (item.freigabeBypassGrund as "schwelle" | "akut" | null | undefined) ??
          null
        }
        hvMeldungStatus={hvMeldungStatus ?? item.hvMeldungStatus}
        angebotId={item.isAngebotDetail ? item.id : null}
        canAcceptAngebot={
          !mieterStatusMode &&
          Boolean(item.isAngebotDetail && item.needsAction)
        }
        privatkunde={privatkunde}
        detailRole={privatkunde ? "kunde" : "hv"}
        mieterStatusMode={mieterStatusMode || Boolean(item.hvMieterView)}
        statusLabelOverride={
          mieterStatusMode || item.hvMieterView
            ? item.status?.trim() || portalMieterStatusLabel(flowStatus)
            : undefined
        }
        coverUrl={item.coverUrl ?? null}
        wartetAufHwLabel={
          mieterStatusMode || item.hvMieterView
            ? null
            : item.wartetAufHwLabel ?? null
        }
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

  async function handleReject() {
    if (!isAngebotAccept) return;
    setLoading(true);
    setError(null);
    const res = await rejectKundeAngebot(item.id, rejectGrund);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRejectOpen(false);
    setRejectGrund("");
    kundePortalToast.angebotAbgelehnt();
    setRejected(true);
    onAccepted?.();
    router.refresh();
  }

  const showAcceptCta =
    (isAngebotAccept || isAuftragAccept) && !accepted && !rejected;

  const footer = showAcceptCta ? (
    <PortalDetailStickyActions
      primaryLabel={isAuftragAccept ? "Änderungen annehmen" : "Angebot annehmen"}
      onPrimary={() => setConfirmOpen(true)}
      primaryLoading={loading}
      secondaryLabel={isAngebotAccept ? "Ablehnen" : undefined}
      onSecondary={isAngebotAccept ? () => setRejectOpen(true) : undefined}
      secondaryDisabled={loading}
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

        {rejected ? (
          <PortalDetailInfoBox>
            <p className="font-semibold">Angebot abgelehnt</p>
            <p className="portal-text-meta mt-1">
              Danke für die Rückmeldung — wir melden uns bei Bedarf.
            </p>
          </PortalDetailInfoBox>
        ) : null}

        {error ? <PortalDetailError message={error} /> : null}

        {item.infoHint ? (
          <PortalDetailInfoBox>{item.infoHint}</PortalDetailInfoBox>
        ) : null}

        <PortalDetailTabs
          tabs={sectionTabs}
          activeId={activeSection}
          onChange={(id) =>
            setActiveSection(
              id as "details" | "bautagebuch" | "dokumente" | "feedback"
            )
          }
          navLabel="Vorgang-Abschnitte"
        >
          {activeSection === "details" ? (
            <div className="space-y-4">
              {item.terminAuftragId &&
              item.terminSlots &&
              item.terminSlots.length > 0 ? (
                <PortalHvTerminSection
                  auftragId={item.terminAuftragId}
                  slots={item.terminSlots}
                  readOnly={!item.hvMieterView}
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

              {item.ansprechpartner ? (
                <PortalAnsprechpartnerCard
                  rolleLabel={item.ansprechpartner.rolleLabel}
                  name={item.ansprechpartner.name}
                  telefon={item.ansprechpartner.telefon}
                  telefonHref={item.ansprechpartner.telefonHref}
                  intro={item.ansprechpartner.intro}
                />
              ) : null}
            </div>
          ) : null}

          {activeSection === "bautagebuch" && showBautagebuchTab ? (
            <BautagebuchAccordionList
              eintraege={(item.bautagebuch ?? []).map((b) => ({
                id: b.id ?? `${b.datum}-${b.titel}`,
                datum: b.datum ?? b.created_at,
                titel: b.titel ?? "Eintrag",
                beschreibung: b.notiz,
                fotos: b.fotos_urls,
              }))}
            />
          ) : null}

          {activeSection === "dokumente" ? (
            <DokumenteTabelle
              heading=""
              emptyText="Noch keine Dokumente."
              dokumente={(item.dokumente ?? []).map((d) => ({
                id: d.id,
                name: d.name,
                datum: d.datum,
                href: d.href,
              }))}
            />
          ) : null}

          {activeSection === "feedback" && item.leadId ? (
            showAnlassBadge ? (
              <OrgVorgangFeedbackSection
                leadId={item.leadId}
                feedbackBereit={item.feedbackBereit}
                handwerkerErledigt={hwErledigt}
                hvFeedback={hvFeedback}
                onSubmitted={onHvFeedbackSubmitted}
              />
            ) : (
              <PortalVorgangFeedbackSection
                leadId={item.leadId}
                feedbackBereit={item.feedbackBereit}
                mieterFeedback={item.mieterFeedback}
              />
            )
          ) : null}
        </PortalDetailTabs>
      </PortalDetailLayout>

      <PortalConfirmDialog
        open={confirmOpen}
        title={isAuftragAccept ? "Änderungen am Auftrag annehmen?" : "Angebot annehmen?"}
        description={
          isAuftragAccept
            ? "Änderungen verbindlich annehmen?"
            : "Angebot verbindlich annehmen?"
        }
        confirmLabel="Verbindlich annehmen"
        loading={loading}
        onConfirm={handleAccept}
        onCancel={() => setConfirmOpen(false)}
      />

      <PortalModalShell
        open={rejectOpen}
        title="Angebot ablehnen?"
        onClose={() => {
          if (loading) return;
          setRejectOpen(false);
        }}
        variant="edit"
        dirty={rejectGrund.trim().length > 0}
        closeOnBackdrop={!loading}
      >
        <label className="flex flex-col gap-1.5">
          <span className="portal-form-label">Grund (optional)</span>
          <textarea
            value={rejectGrund}
            onChange={(e) => setRejectGrund(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="z. B. Preis, Umfang, Zeitpunkt …"
            className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            disabled={loading}
          />
        </label>
        <div className="portal-confirm-actions mt-5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleReject()}
            className="btn-pill-outline portal-btn portal-confirm-actions-primary !border-red-200 !text-red-800"
          >
            {loading ? "Wird gesendet…" : "Ablehnen"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRejectOpen(false)}
            className="btn-pill-outline portal-btn portal-confirm-actions-cancel"
          >
            Abbrechen
          </button>
        </div>
      </PortalModalShell>
    </>
  );
}
