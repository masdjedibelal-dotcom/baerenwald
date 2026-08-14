"use client";

import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { createPartnerBefundEintrag } from "@/app/actions/partner-befund";
import { PartnerAbnahmeAbschlussSheet } from "@/components/partner/PartnerAbnahmeAbschlussSheet";
import { PartnerAbnahmeReviewSection } from "@/components/partner/PartnerAbnahmeReviewSection";
import { PartnerDokumentPreviewModal } from "@/components/partner/PartnerDokumentPreviewModal";
import { PartnerAuftragErledigtSection } from "@/components/partner/PartnerAuftragErledigtSection";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import { PartnerPositionLebenszyklusList } from "@/components/partner/PartnerPositionLebenszyklusList";
import { PartnerTermineRueckfrageSection } from "@/components/partner/PartnerTermineRueckfrageSection";
import {
  PartnerDetailError,
  PartnerDetailLayout,
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PartnerFachdokuSlots } from "@/components/partner/PartnerFachdokuSlots";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import {
  PortalDetailCard,
  PortalDetailMetaField,
} from "@/components/shared/PortalDetailCard";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
import { resolvePartnerDetailTitelFromAuftrag } from "@/lib/partner/partner-listen-titel";
import {
  buildBauauftragComplianceItems,
  isPartnerBauprojektAuftrag,
} from "@/lib/partner/compliance-summary";
import {
  buildPartnerAuftragDokumentZeilen,
  partnerAuftragKannRechnungHochladen,
  partnerAuftragKannUnterlagenHochladen,
  partnerAuftragZeigtDokumenteUpload,
  partnerNeedsAutoRechnungPrompt,
} from "@/lib/partner/partner-auftrag-dokumente";
import { HW_ABNAHME_COPY } from "@/lib/partner/hw-abnahme";
import { partnerHwDokumentUploadHint } from "@/lib/partner/partner-hw-dokument-copy";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_BAUTAGEBUCH_ANHAENGE,
  PARTNER_MAX_PDF_MB,
  PARTNER_MAX_PHOTO_MB,
  validatePartnerAngebotFiles,
  validatePartnerBautagebuchFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import {
  fmtPartnerDate,
  fmtPartnerEuro,
} from "@/lib/partner/partner-detail-format";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import { summeKonditionNetto } from "@/lib/partner/partner-konditionen";
import { resolvePartnerVorgangListenStatus } from "@/lib/partner/partner-vorgang-display";
import { partnerKannErledigtMelden } from "@/lib/partner/partner-position-erledigt";
import { type VorgangState } from "@/lib/partner/vorgang-state";
import {
  formatHwTerminRange,
  HW_AUFTRAG_COPY,
  hwAuftragStatusLabel,
  hwAuftragStatusStyle,
} from "@/lib/portal2/hw-auftrag-detail";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { useEffect, useMemo, useRef, useState } from "react";

function PartnerBefundForm({
  auftragId,
  onDone,
}: {
  auftragId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beschreibung, setBeschreibung] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [anhaenge, setAnhaenge] = useState<File[]>([]);

  function handleAnhaengeChange(files: File[]) {
    const list = files.slice(0, PARTNER_MAX_BAUTAGEBUCH_ANHAENGE);
    const err = validatePartnerBautagebuchFiles(list, 0);
    if (err) {
      setError(err);
      setAnhaenge([]);
      return;
    }
    setError(null);
    setAnhaenge(list);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("auftragId", auftragId);
    fd.set("beschreibung", beschreibung);
    fd.set("datum", datum);
    for (const f of anhaenge) fd.append("photos", f);

    const res = await createPartnerBefundEintrag(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.bautagebuchGespeichert(true);
    router.refresh();
    onDone();
  }

  return (
    <form
      onSubmit={onSubmit}
      data-testid="partner-befund-form"
      className="portal-text-body space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
    >
      <p className="font-semibold text-text-primary">Schadenbefund dokumentieren</p>
      <p className="portal-text-meta text-text-secondary">
        Leckortung und Schadenursache mit Fotos — sichtbar für Verwaltung und Versicherungsakte.
      </p>
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Datum</span>
        <input
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <PartnerKiKorrekturField
        scope="bautagebuch"
        label="Befund"
        value={beschreibung}
        onChange={setBeschreibung}
        rows={4}
        required
        auftragTitel={null}
        placeholder="Einsprechen oder tippen — z. B. Leck in Versorgungsleitung Decke Bad …"
      />
      <FileUploadField
        label="Fotos zum Befund"
        hint={`Mindestens 1 Foto (JPG/PNG/WebP, max. ${PARTNER_MAX_PHOTO_MB} MB).`}
        accept="image/jpeg,image/png,image/webp"
        multiple
        selectedName={
          anhaenge.length > 0
            ? anhaenge.length === 1
              ? anhaenge[0].name
              : `${anhaenge.length} Fotos ausgewählt`
            : null
        }
        onChange={handleAnhaengeChange}
      />
      {error ? (
        <p className="portal-text-body text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-pill-primary portal-btn-compact disabled:opacity-60"
        >
          {loading ? "Wird gespeichert…" : "Befund speichern"}
        </button>
      </div>
    </form>
  );
}

export function PartnerAuftragDetail({
  item,
  vorgangState,
  onBack,
  focusBautagebuch,
  deepLinkAnfrageId,
  focusAbnahme,
  deepLinkProtokollId,
}: {
  item: PartnerAuftragItem;
  vorgangState?: VorgangState;
  onBack?: () => void;
  focusBautagebuch?: boolean;
  deepLinkAnfrageId?: string | null;
  focusAbnahme?: boolean;
  deepLinkProtokollId?: string | null;
}) {
  const router = useRouter();
  const [showBefund, setShowBefund] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  const [abschlussOpen, setAbschlussOpen] = useState(false);
  const [abschlussDone, setAbschlussDone] = useState(false);
  const [abschlussVollstaendig, setAbschlussVollstaendig] = useState(false);
  const [rechnungDocOpen, setRechnungDocOpen] = useState(false);
  const [autoOpenPreferred, setAutoOpenPreferred] = useState(false);
  const autoDocDismissedRef = useRef<{ rechnung?: boolean }>({});
  const [abnahmePdfUrl, setAbnahmePdfUrl] = useState<string | null>(
    item.abnahme_protokoll_url ?? null
  );
  const [abnahmeProtokollId, setAbnahmeProtokollId] = useState<string | null>(
    deepLinkProtokollId ?? null
  );
  const [activeTab, setActiveTab] = useState(() => {
    if (focusAbnahme) return "abnahme";
    if (focusBautagebuch) return "dokumentation";
    return "uebersicht";
  });

  const btAnfrageId =
    deepLinkAnfrageId?.trim() ||
    item.bautagebuchAnfrageId?.trim() ||
    null;
  const preferredPositionIds = item.bautagebuchAnfragePositionIds ?? [];

  useEffect(() => {
    if (!focusBautagebuch) return;
    if (preferredPositionIds.length > 0) setAutoOpenPreferred(true);
    setActiveTab("dokumentation");
  }, [focusBautagebuch, preferredPositionIds.length]);

  useEffect(() => {
    if (focusAbnahme) setActiveTab("abnahme");
  }, [focusAbnahme]);

  /** Jedes Mal beim Öffnen des Vorgangs — nach Nein in dieser Session nicht sofort erneut. */
  useEffect(() => {
    autoDocDismissedRef.current = {};
  }, [item.id]);

  useEffect(() => {
    if (abschlussOpen || focusAbnahme) return;
    if (
      partnerNeedsAutoRechnungPrompt(item) &&
      !autoDocDismissedRef.current.rechnung
    ) {
      setRechnungDocOpen(true);
    }
  }, [
    item.id,
    item.hw_rechnung_eingereicht_at,
    item.hw_abschluss_signiert_am,
    item.abnahme_protokoll_url,
    abschlussOpen,
    focusAbnahme,
  ]);

  const kannUnterlagenHochladen = partnerAuftragKannUnterlagenHochladen(item);
  const kannRechnungHochladen = partnerAuftragKannRechnungHochladen(item);
  const zeigtDokumenteUpload = partnerAuftragZeigtDokumenteUpload(item);
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);

  const befundEintraege = useMemo(
    () => item.bautagebuch.filter((e) => e.eintrag_typ === "befund"),
    [item.bautagebuch]
  );
  const eigenerBefund = befundEintraege.some((e) => e.own);
  const zeigtBefundBereich =
    item.lead?.hv_meldung_status === "notmassnahme" || befundEintraege.length > 0;

  const befundAccordion = useMemo(
    () =>
      befundEintraege.map((e) => ({
        id: e.id,
        datum: e.datum,
        titel: e.titel,
        beschreibung: e.beschreibung,
        fotos: e.foto_signed_urls,
      })),
    [befundEintraege]
  );

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerAuftragKonditionZeilen(item.positionen, {
        excludePositionIds: item.nachreichungOpenPositionIds,
      }),
    [item.positionen, item.nachreichungOpenPositionIds]
  );
  const bauauftragUnterlagen = useMemo(
    () =>
      item.vertrag &&
      isPartnerBauprojektAuftrag({
        ist_bauprojekt: item.vertrag.ist_bauprojekt,
        compliance_projekt: item.vertrag.compliance_projekt,
      })
        ? buildBauauftragComplianceItems(
            item.vertrag.compliance_stamm,
            item.vertrag.compliance_projekt,
            item.vertrag.compliance_bauauftrag
          )
        : [],
    [item.vertrag]
  );
  const dokumentZeilen = useMemo(() => buildPartnerAuftragDokumentZeilen(item), [item]);

  const kannAbschluss =
    !abschlussDone &&
    partnerKannErledigtMelden({
      positionen: item.positionen,
      vorgangState,
      auftragStatus: item.status,
      hwAbschlussSigniertAm: item.hw_abschluss_signiert_am,
      abnahmeProtokollUrl: item.abnahme_protokoll_url,
      abnahmeFreigabeStatus: item.abnahme_freigabe_status,
    });

  async function uploadUnterlagen() {
    if (!item.angebotHandwerkerId) return;
    const err = validatePartnerAngebotFiles(angebotPdfs, { required: true });
    if (err) {
      setPdfError(err);
      return;
    }
    setPdfLoading(true);
    setPdfError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.angebotHandwerkerId);
    for (const f of angebotPdfs) fd.append("pdfs", f);
    const res = await submitPartnerAngebotPdf(fd);
    setPdfLoading(false);
    if (!res.ok) {
      setPdfError(res.error);
      return;
    }
    partnerPortalToast.unterlagenHochgeladen();
    setAngebotPdfs([]);
    router.refresh();
  }

  async function onRechnungSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item.angebotHandwerkerId || !rechnungPdf) return;
    setRechnungLoading(true);
    setRechnungError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.angebotHandwerkerId);
    fd.set("pdf", rechnungPdf);
    const res = await submitPartnerRechnung(fd);
    setRechnungLoading(false);
    if (!res.ok) {
      setRechnungError(res.error);
      return;
    }
    partnerPortalToast.rechnungEingereicht();
    setRechnungPdf(null);
    router.refresh();
  }
  const { label: listenStatusLabel } =
    resolvePartnerVorgangListenStatus(vorgangState, item);

  const titel = resolvePartnerDetailTitelFromAuftrag(item);
  const statusLabel = abschlussDone
    ? "Zur Freigabe"
    : hwAuftragStatusLabel({
        vorgangState,
        fallback: listenStatusLabel,
      });
  const statusStyle = hwAuftragStatusStyle(statusLabel);

  const lead = item.lead;
  const gewerk =
    item.positionen?.[0]?.gewerk_name?.trim() ||
    lead?.bereiche?.[0] ||
    null;
  const strasse =
    lead?.objekt?.strasse?.trim() ||
    [lead?.strasse, lead?.hausnummer].filter(Boolean).join(" ").trim() ||
    null;
  const einheit = lead?.melder_einheit?.trim() || null;
  const objektLine = [strasse, einheit].filter(Boolean).join(" · ") || null;
  const beschreibung = lead?.kontakt_nachricht?.trim() || null;
  const kontaktName =
    lead?.melder_name?.trim() || lead?.kontakt_name?.trim() || null;
  const kontaktTel = lead?.melder_telefon?.trim() || null;
  const terminLabel = formatHwTerminRange(item.start_datum, item.end_datum);
  const sumNetto = summeKonditionNetto(konditionZeilen, true);

  const einsatzCard = (
    <PortalDetailCard title={HW_AUFTRAG_COPY.einsatzTitle}>
      {gewerk ? (
        <PortalDetailMetaField label="Gewerk">{gewerk}</PortalDetailMetaField>
      ) : null}
      {objektLine ? (
        <PortalDetailMetaField label="Objekt / Leistungsort">
          {objektLine}
        </PortalDetailMetaField>
      ) : null}
      {kontaktName || kontaktTel ? (
        <PortalDetailMetaField label="Kontakt vor Ort">
          {kontaktName ? <span>{kontaktName}</span> : null}
          {kontaktTel ? (
            <a
              href={`tel:${kontaktTel.replace(/\s+/g, "")}`}
              className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: PORTAL_VAR.primary }}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {kontaktTel}
            </a>
          ) : null}
        </PortalDetailMetaField>
      ) : null}
      {terminLabel ? (
        <PortalDetailMetaField label="Termin">{terminLabel}</PortalDetailMetaField>
      ) : null}
      {sumNetto > 0 ? (
        <PortalDetailMetaField label="Vergütung (Netto)">
          {fmtPartnerEuro(sumNetto)}
        </PortalDetailMetaField>
      ) : null}
    </PortalDetailCard>
  );

  const coverUrl = lead?.objekt?.cover_url ?? null;

  const DETAIL_TABS: PortalDetailTab[] = [
    { id: "uebersicht", label: "Übersicht" },
    { id: "dokumentation", label: "Dokumentation" },
    { id: "dokumente", label: "Dokumente" },
    { id: "abnahme", label: "Abnahme" },
  ];

  const stickyFooter = kannAbschluss ? (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setAbschlussOpen(true)}
        className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
        data-testid="hw-auftrag-abschliessen"
      >
        {HW_AUFTRAG_COPY.ausfuehrenCta}
      </button>
    </div>
  ) : undefined;

  const handleBack = onBack ?? (() => router.back());

  return (
    <PartnerDetailLayout footer={stickyFooter}>
      <PortalEntityDetailLayout
        coverUrl={coverUrl}
        onBack={handleBack}
        backLabel="← Zurück"
        title={titel}
        statusLabel={statusLabel}
        statusPillStyle={statusStyle}
        tabs={DETAIL_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsNavLabel="Auftrags-Abschnitte"
      >
        {activeTab === "uebersicht" ? (
          <div className="space-y-3.5">
            {einsatzCard}
            {beschreibung ? (
              <PortalDetailCard title={HW_AUFTRAG_COPY.beschreibungTitle}>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  {beschreibung}
                </p>
              </PortalDetailCard>
            ) : null}
            {vorgangState !== "erledigt" ? (
              <PartnerTermineRueckfrageSection auftragId={item.id} />
            ) : null}
            <PartnerAuftragErledigtSection
              positionen={item.positionen}
              layout="cta"
              done={abschlussDone}
              vollstaendig={abschlussVollstaendig}
            />
          </div>
        ) : null}

        {activeTab === "dokumentation" ? (
          <div className="space-y-3.5">
            <PortalDetailCard>
              <PartnerPositionLebenszyklusList
                auftragId={item.id}
                auftragTitel={titel}
                anfrageId={btAnfrageId}
                preferredPositionIds={preferredPositionIds}
                autoOpenPreferred={autoOpenPreferred}
                positionen={item.positionen.map((p) => ({
                  id: p.id,
                  leistung_name: p.leistung_name,
                  leistung_status: p.leistung_status,
                  verguetung: p.verguetung,
                  typ: p.typ,
                  anerkennung_status: p.anerkennung_status,
                  preis_partner: p.preis_partner,
                  einheit: p.einheit,
                  menge: p.menge,
                  zeit_minuten_summe: p.zeit_minuten_summe,
                }))}
                onDone={() => router.refresh()}
              />

              <PartnerFachdokuSlots auftragId={item.id} className="mt-4" />

              {konditionZeilen.length > 0 ? (
                <PartnerLeistungenKonditionenCard
                  zeilen={konditionZeilen}
                  mode="readonly"
                  variant="totalsOnly"
                  gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
                />
              ) : null}
            </PortalDetailCard>

            {zeigtBefundBereich ? (
              <PortalDetailCard title="Schadenbefund">
                {befundAccordion.length > 0 ? (
                  <BautagebuchAccordionList
                    heading="Dokumentierter Befund"
                    className="!border-t-0 !pt-0"
                    eintraege={befundAccordion}
                  />
                ) : null}
                {!eigenerBefund && !showBefund ? (
                  <button
                    type="button"
                    onClick={() => setShowBefund(true)}
                    className="btn-pill-primary portal-btn-compact"
                    data-testid="partner-befund-start"
                  >
                    Befund + Fotos hochladen
                  </button>
                ) : null}
                {showBefund && !eigenerBefund ? (
                  <PartnerBefundForm
                    auftragId={item.id}
                    onDone={() => setShowBefund(false)}
                  />
                ) : null}
              </PortalDetailCard>
            ) : null}
          </div>
        ) : null}

        {activeTab === "dokumente" ? (
          <div className="space-y-3.5">
            <PartnerDetailSection title="Dokumente">
              <DokumenteTabelle
                dokumente={dokumentZeilen}
                heading=""
                emptyText={
                  kannUnterlagenHochladen
                    ? "Dokumente hier ablegen"
                    : "Noch keine Dokumente."
                }
                className="!border-t-0 !pt-0"
                upload={
                  kannUnterlagenHochladen
                    ? {
                        accept:
                          "image/jpeg,image/png,image/webp,application/pdf,.pdf",
                        multiple: true,
                        hint: partnerHwDokumentUploadHint(),
                        disabled: pdfLoading,
                        selectedLabel:
                          angebotPdfs.length > 0
                            ? angebotPdfs.length === 1
                              ? angebotPdfs[0].name
                              : `${angebotPdfs.length} Dateien`
                            : null,
                        error: pdfError,
                        submitting: pdfLoading,
                        onFiles: (files) => {
                          const list = files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
                          const err = validatePartnerAngebotFiles(list, {
                            required: false,
                          });
                          setPdfError(err);
                          setAngebotPdfs(err ? [] : list);
                        },
                        onSubmit: () => {
                          void uploadUnterlagen();
                        },
                        submitLabel: "Hochladen",
                      }
                    : undefined
                }
              />

              {zeigtDokumenteUpload ? (
                <div className="mt-4 space-y-4">
                  {kannRechnungHochladen && item.angebotHandwerkerId ? (
                    <div
                      className="space-y-2 rounded-xl border p-4"
                      style={{ borderColor: PORTAL_VAR.line }}
                    >
                      <p className="portal-text-body font-semibold text-text-primary">
                        {HW_ABNAHME_COPY.rechnungTitle}
                      </p>
                      <p className="text-[12.5px] text-text-secondary">
                        {HW_ABNAHME_COPY.rechnungBody}
                      </p>
                      <button
                        type="button"
                        onClick={() => setRechnungDocOpen(true)}
                        className="btn-pill portal-btn"
                      >
                        Rechnung prüfen &amp; einreichen
                      </button>
                    </div>
                  ) : item.angebotHandwerkerId &&
                    !item.hw_rechnung_eingereicht_at &&
                    (item.angebotHwStatus ?? "").toLowerCase() === "uebernommen" &&
                    item.projektvertrag_bestaetigt_am &&
                    !item.hw_abschluss_signiert_am &&
                    !item.abnahme_protokoll_url ? (
                    <p className="rounded-xl border border-dashed px-3 py-3 text-[12.5px] text-text-secondary">
                      {HW_ABNAHME_COPY.rechnungBlockedOhneAbnahme}
                    </p>
                  ) : null}

                  {kannRechnungHochladen ? (
                    <form
                      onSubmit={onRechnungSubmit}
                      className="space-y-2 rounded-xl border border-dashed p-4"
                      style={{ borderColor: PORTAL_VAR.line }}
                    >
                      <p className="portal-text-body font-semibold text-text-primary">
                        Eigenes Rechnungs-PDF (optional)
                      </p>
                      <FileUploadField
                        label="Rechnungs-PDF"
                        accept="application/pdf,.pdf"
                        hint={`PDF, max. ${PARTNER_MAX_PDF_MB} MB`}
                        selectedName={rechnungPdf?.name}
                        onChange={(files) => {
                          const file = files[0] ?? null;
                          if (!file) {
                            setRechnungPdf(null);
                            return;
                          }
                          const err = validatePartnerPdfFile(file);
                          setRechnungError(err);
                          setRechnungPdf(err ? null : file);
                        }}
                      />
                      {rechnungError ? (
                        <PartnerDetailError message={rechnungError} />
                      ) : null}
                      <button
                        type="submit"
                        disabled={rechnungLoading || !rechnungPdf}
                        className="btn-pill-outline portal-btn"
                      >
                        {rechnungLoading ? "Wird gesendet…" : "PDF absenden"}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              {rechnungEingereicht ? (
                <div className="mt-4">
                  <PartnerDetailSuccessBox>
                    <p className="font-semibold">Rechnung eingereicht</p>
                    <p className="text-sm">
                      Hochgeladen am {fmtPartnerDate(item.hw_rechnung_eingereicht_at)}
                    </p>
                  </PartnerDetailSuccessBox>
                </div>
              ) : null}
            </PartnerDetailSection>

            {bauauftragUnterlagen.length > 0 ? (
              <PartnerComplianceCheckliste
                title="Nachweise laut Projektvertrag (Anlage 1)"
                items={bauauftragUnterlagen}
                auftragId={item.id}
                gruppiert
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === "abnahme" ? (
          <div className="space-y-3.5">
            <PartnerFachdokuSlots auftragId={item.id} variant="hint" />
            {abnahmePdfUrl ||
            item.abnahme_protokoll_url ||
            item.hw_abschluss_signiert_am ||
            focusAbnahme ||
            kannAbschluss ? (
              <PartnerAbnahmeReviewSection
                auftragId={item.id}
                protokollId={abnahmeProtokollId || item.abnahme_protokoll_id}
                initialPdfUrl={abnahmePdfUrl || item.abnahme_protokoll_url}
                initialFreigabeStatus={
                  abschlussDone
                    ? item.abnahme_freigabe_status || "zur_freigabe"
                    : item.abnahme_freigabe_status
                }
                focus={focusAbnahme || abschlussDone}
              />
            ) : (
              <p className="portal-text-body text-text-secondary">
                Noch kein Abnahmeprotokoll. Schließe den Auftrag ab, sobald alle
                Leistungen erledigt sind.
              </p>
            )}
          </div>
        ) : null}
      </PortalEntityDetailLayout>

      <PartnerAbnahmeAbschlussSheet
        open={abschlussOpen}
        auftragId={item.id}
        auftragTitel={titel}
        leistungItems={item.positionen.map((p) => ({
          id: p.id,
          leistung_name: p.leistung_name,
          beschreibung: p.beschreibung,
          gewerk_name: p.gewerk_name,
          leistung_status: p.leistung_status,
        }))}
        defaultOrt={[item.plz, item.ort]
          .filter((v) => v && v !== "—")
          .join(" ")}
        onClose={() => setAbschlussOpen(false)}
        onSuccess={(result) => {
          setAbschlussVollstaendig(result.vollstaendig);
          setAbschlussDone(true);
          setAbschlussOpen(false);
          setRechnungDocOpen(false);
          // Kein Auto-Rechnungs-Dialog direkt nach Signatur — erst Vorgang mit neuem Status.
          autoDocDismissedRef.current.rechnung = true;
          if (result.pdf_url) setAbnahmePdfUrl(result.pdf_url);
          if (result.protokoll_id) setAbnahmeProtokollId(result.protokoll_id);
          setActiveTab("abnahme");
        }}
      />

      {item.angebotHandwerkerId ? (
        <PartnerDokumentPreviewModal
          open={rechnungDocOpen}
          anfrageId={item.angebotHandwerkerId}
          art="rechnung"
          leistungsZeitraum={
            abschlussDone
              ? new Date().toLocaleDateString("de-DE")
              : undefined
          }
          onClose={() => {
            autoDocDismissedRef.current.rechnung = true;
            setRechnungDocOpen(false);
          }}
          onSuccess={() => setRechnungDocOpen(false)}
          allowSkip
        />
      ) : null}
    </PartnerDetailLayout>
  );
}
