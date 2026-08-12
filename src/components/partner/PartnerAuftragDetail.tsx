"use client";

import { useRouter } from "next/navigation";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { PartnerAbnahmeAbschlussSheet } from "@/components/partner/PartnerAbnahmeAbschlussSheet";
import { PartnerAbnahmeReviewSection } from "@/components/partner/PartnerAbnahmeReviewSection";
import { PartnerDokumentPreviewModal } from "@/components/partner/PartnerDokumentPreviewModal";
import { PartnerAuftragErledigtSection } from "@/components/partner/PartnerAuftragErledigtSection";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import { PartnerPositionLebenszyklusList } from "@/components/partner/PartnerPositionLebenszyklusList";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PartnerFachdokuSlots } from "@/components/partner/PartnerFachdokuSlots";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
import {
  PortalDetailError,
  PortalDetailLayout,
  PortalDetailSection,
  PortalDetailStickyActions,
  PortalDetailSuccessBox,
} from "@/components/shared/PortalDetailUi";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
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
} from "@/lib/partner/partner-auftrag-dokumente";
import { HW_ABNAHME_COPY } from "@/lib/partner/hw-abnahme";
import { partnerHwDokumentUploadHint } from "@/lib/partner/partner-hw-dokument-copy";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  partnerDetailOrtMetaLine,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import { resolvePartnerVorgangListenStatus } from "@/lib/partner/partner-vorgang-display";
import { partnerKannErledigtMelden } from "@/lib/partner/partner-position-erledigt";
import { type VorgangState } from "@/lib/partner/vorgang-state";
import {
  HW_AUFTRAG_COPY,
  hwAuftragStatusLabel,
  hwAuftragStatusStyle,
} from "@/lib/portal2/hw-auftrag-detail";
import { buildPartnerVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { useEffect, useMemo, useState } from "react";

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
  const { refresh } = usePortalRefresh();
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
  const [abnahmePdfUrl, setAbnahmePdfUrl] = useState<string | null>(
    item.abnahme_protokoll_url ?? null
  );
  const [abnahmeProtokollId, setAbnahmeProtokollId] = useState<string | null>(
    deepLinkProtokollId ?? null
  );
  const [abnahmePunkteCount, setAbnahmePunkteCount] = useState<number | null>(null);
  const [abnahmeMaengelCount, setAbnahmeMaengelCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (focusAbnahme) return "abnahme";
    if (focusBautagebuch) return "dokumentation";
    // Laufender Auftrag: direkt Leistungen (Update / Erledigt / Regie)
    if (vorgangState === "in_bearbeitung") return "dokumentation";
    return "uebersicht";
  });

  const btAnfrageId =
    deepLinkAnfrageId?.trim() ||
    item.bautagebuchAnfrageId?.trim() ||
    null;
  const preferredPositionIds = item.bautagebuchAnfragePositionIds ?? [];

  useEffect(() => {
    if (!focusBautagebuch) return;
    if (preferredPositionIds.length > 0 && vorgangState !== "erledigt") {
      setAutoOpenPreferred(true);
    }
    setActiveTab("dokumentation");
  }, [focusBautagebuch, preferredPositionIds.length, vorgangState]);

  useEffect(() => {
    if (focusAbnahme) setActiveTab("abnahme");
  }, [focusAbnahme]);

  const kannUnterlagenHochladen = partnerAuftragKannUnterlagenHochladen(item);
  const kannRechnungHochladen = partnerAuftragKannRechnungHochladen(item);
  const zeigtDokumenteUpload = partnerAuftragZeigtDokumenteUpload(item);
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);

  const konditionZeilen = useMemo(() => {
    // Nachtrag/Regie in Prüfung oder abgelehnt nicht in die Vergütung einrechnen
    const freigegebene = item.positionen.filter((p) => {
      const a = (p.anerkennung_status ?? "nicht_noetig").toLowerCase();
      return a !== "in_pruefung" && a !== "abgelehnt";
    });
    return resolvePartnerAuftragKonditionZeilen(freigegebene, {
      excludePositionIds: item.nachreichungOpenPositionIds,
    });
  }, [item.positionen, item.nachreichungOpenPositionIds]);
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
    await refresh();
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
    await refresh();
  }
  const { label: listenStatusLabel } =
    resolvePartnerVorgangListenStatus(vorgangState, item);

  const titel = resolvePartnerDetailTitelFromAuftrag(item);
  const statusLabel = abschlussDone
    ? "Abgeschlossen"
    : hwAuftragStatusLabel({
        vorgangState,
        fallback: listenStatusLabel,
      });
  const statusStyle = hwAuftragStatusStyle(statusLabel);

  const crmNotiz =
    item.hw_crm_notiz?.trim() || item.aufgabe_notiz?.trim() || null;
  const meldeFotos = useMemo(() => {
    const fd = item.lead?.funnel_daten as { fotos?: unknown } | null | undefined;
    if (!Array.isArray(fd?.fotos)) return [] as string[];
    return fd.fotos
      .filter(
        (u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)
      )
      .slice(0, 12);
  }, [item.lead?.funnel_daten]);

  const detailVm = useMemo(
    () =>
      buildPartnerVorgangDetailVm({
        idLabel: item.id.slice(0, 8).toUpperCase(),
        titel,
        statusLabel,
        lead: item.lead,
        plz: item.plz ?? undefined,
        ort: item.ort ?? undefined,
        gewerkName: item.positionen?.[0]?.gewerk_name ?? null,
        konditionZeilen,
        fotos: meldeFotos,
      }),
    [
      item.id,
      item.lead,
      item.plz,
      item.ort,
      item.positionen,
      titel,
      statusLabel,
      konditionZeilen,
      meldeFotos,
    ]
  );

  const coverUrl = item.lead?.objekt?.cover_url ?? null;
  const isErledigt = vorgangState === "erledigt";

  const DETAIL_TABS: PortalDetailTab[] = [
    { id: "uebersicht", label: "Übersicht" },
    { id: "dokumentation", label: "Leistungen" },
    { id: "dokumente", label: "Dokumente" },
    { id: "abnahme", label: "Abschluss" },
  ];

  const actionFooter = kannAbschluss ? (
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
  ) : kannRechnungHochladen ? (
    <PortalDetailStickyActions
      primaryLabel={HW_ABNAHME_COPY.rechnungCta}
      onPrimary={() => setRechnungDocOpen(true)}
      secondaryLabel={HW_ABNAHME_COPY.rechnungSecondaryCta}
      onSecondary={() => {
        setActiveTab("dokumente");
        window.setTimeout(() => {
          document
            .getElementById("partner-rechnung-eigenes-pdf")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80);
      }}
    />
  ) : undefined;

  const handleBack = onBack ?? (() => router.back());

  return (
    <PortalDetailLayout footer={actionFooter}>
      <PortalEntityDetailLayout
        layout={isErledigt ? "hv" : "default"}
        coverUrl={coverUrl}
        onBack={handleBack}
        backLabel="← Zurück"
        title={titel}
        metaLine={partnerDetailOrtMetaLine(item.lead)}
        statusLabel={isErledigt ? undefined : statusLabel}
        statusPillStyle={isErledigt ? undefined : statusStyle}
        tabs={DETAIL_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsNavLabel="Auftrags-Abschnitte"
      >
        {activeTab === "uebersicht" ? (
          <div className="space-y-3.5">
            {crmNotiz ? (
              <PortalDetailCard title="Hinweis vom Auftraggeber">
                <p className="whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-text-primary">
                  {crmNotiz}
                </p>
              </PortalDetailCard>
            ) : null}
            <VorgangDetailBlocks vm={detailVm} />
            {!isErledigt ? (
              <PartnerAuftragErledigtSection
                positionen={item.positionen}
                layout="cta"
                done={abschlussDone}
                vollstaendig={abschlussVollstaendig}
              />
            ) : null}
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
                autoOpenPreferred={autoOpenPreferred && !isErledigt}
                readOnly={isErledigt}
                positionen={item.positionen.map((p) => ({
                  id: p.id,
                  leistung_name: p.leistung_name,
                  leistung_status: p.leistung_status,
                  verguetung: p.verguetung,
                  typ: p.typ,
                  anerkennung_status: p.anerkennung_status,
                  preis_partner: p.preis_partner,
                  stundensatz: p.stundensatz,
                  einheit: p.einheit,
                  menge: p.menge,
                  zeit_minuten_summe: p.zeit_minuten_summe,
                }))}
                onDone={() => refresh()}
              />

              {!isErledigt ? (
                <PartnerFachdokuSlots auftragId={item.id} className="mt-4" />
              ) : null}

              {konditionZeilen.length > 0 ? (
                <PartnerLeistungenKonditionenCard
                  zeilen={konditionZeilen}
                  mode="readonly"
                  variant="totalsOnly"
                  gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
                />
              ) : null}
            </PortalDetailCard>

          </div>
        ) : null}

        {activeTab === "dokumente" ? (
          <div className="space-y-3.5">
            <PortalDetailSection title="Dokumente">
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
                  {kannRechnungHochladen ? (
                    <p className="border-t border-border-light pt-4 text-[12.5px] text-text-secondary">
                      {HW_ABNAHME_COPY.rechnungDocsHint}
                    </p>
                  ) : item.angebotHandwerkerId &&
                    !item.hw_rechnung_eingereicht_at &&
                    (item.angebotHwStatus ?? "").toLowerCase() === "uebernommen" &&
                    item.projektvertrag_bestaetigt_am &&
                    !item.hw_abschluss_signiert_am &&
                    !item.abnahme_protokoll_url ? (
                    <p className="border-t border-dashed border-border-light px-0 py-3 text-[12.5px] text-text-secondary">
                      {HW_ABNAHME_COPY.rechnungBlockedOhneAbnahme}
                    </p>
                  ) : null}

                  {kannRechnungHochladen ? (
                    <form
                      id="partner-rechnung-eigenes-pdf"
                      onSubmit={onRechnungSubmit}
                      className="space-y-2 border-t border-dashed border-border-light pt-4"
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
                        <PortalDetailError message={rechnungError} />
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
                  <PortalDetailSuccessBox>
                    <p className="font-semibold">Rechnung eingereicht</p>
                    <p className="text-sm">
                      Hochgeladen am {fmtPartnerDate(item.hw_rechnung_eingereicht_at)}
                    </p>
                  </PortalDetailSuccessBox>
                </div>
              ) : null}
            </PortalDetailSection>

            {isErledigt ? (
              <PartnerFachdokuSlots auftragId={item.id} />
            ) : null}

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
                initialPunkteCount={abnahmePunkteCount}
                initialMaengelCount={abnahmeMaengelCount}
                focus={focusAbnahme || abschlussDone}
                erledigt={isErledigt}
              />
            ) : (
              <p className="portal-text-body text-text-secondary">
                Noch kein Abschlussprotokoll. Schließe den Auftrag ab, sobald alle
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
          if (result.pdf_url) setAbnahmePdfUrl(result.pdf_url);
          if (result.protokoll_id) setAbnahmeProtokollId(result.protokoll_id);
          setAbnahmePunkteCount(result.punkte_count);
          setAbnahmeMaengelCount(result.maengel_count);
          setActiveTab("abnahme");
        }}
      />

      {item.angebotHandwerkerId ? (
        <PartnerDokumentPreviewModal
          open={rechnungDocOpen}
          anfrageId={item.angebotHandwerkerId}
          art="rechnung"
          skipAsk
          leistungsZeitraum={
            abschlussDone || Boolean(item.hw_abschluss_signiert_am)
              ? new Date().toLocaleDateString("de-DE")
              : undefined
          }
          onClose={() => setRechnungDocOpen(false)}
          onSuccess={() => {
            setRechnungDocOpen(false);
            void refresh();
          }}
          allowSkip={false}
        />
      ) : null}
    </PortalDetailLayout>
  );
}
