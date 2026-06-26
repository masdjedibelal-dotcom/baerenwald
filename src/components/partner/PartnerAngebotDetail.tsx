"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailLayout,
  PartnerDetailSection,
  PartnerDetailStickyActions,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
import {
  DokumenteTabelle,
  type DokumentZeile,
} from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAngebotPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

const PDF_FORM_ID = "partner-angebot-pdf-form";
const RECHNUNG_FORM_ID = "partner-rechnung-form";

function hwStatusLabel(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "uebernommen") return "Preise vereinbart";
  return "Offen";
}

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);

  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  const uebernommen = hwSt === "uebernommen";
  const vertragBestaetigt = Boolean(item.projektvertrag_bestaetigt_am);
  const vertragspaketAktiv = uebernommen && !vertragBestaetigt;
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const hatPdf = Boolean(
    item.hw_angebot_pdf_url ||
      item.hw_angebot_pdf_signed_url ||
      item.hw_angebot_anhang_urls?.length
  );
  const kannPdfHochladen = uebernommen && !hatPdf;
  const kannRechnungHochladen =
    uebernommen && vertragBestaetigt && !rechnungEingereicht;

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerKonditionZeilen(
        item.crm_positionen_raw,
        { gewerkId: item.gewerk_id },
        item.hw_konditionen
      ),
    [item.crm_positionen_raw, item.gewerk_id, item.hw_konditionen]
  );

  const sections = useMemo(
    () =>
      buildPartnerAngebotPortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const anhangSigned =
      item.hw_angebot_anhang_signed_urls?.length
        ? item.hw_angebot_anhang_signed_urls
        : item.hw_angebot_pdf_signed_url
          ? [item.hw_angebot_pdf_signed_url]
          : [];
    anhangSigned.forEach((href, i) => {
      rows.push({
        id: `hw-angebot-pdf-${i}`,
        datum: item.hw_eingereicht_at,
        name: anhangSigned.length > 1 ? `Angebots-PDF ${i + 1}` : "Angebots-PDF",
        href,
      });
    });
    if (item.hw_rechnung_pdf_signed_url) {
      rows.push({
        id: "hw-rechnung-pdf",
        datum: item.hw_rechnung_eingereicht_at,
        name: "Rechnung (eingereicht)",
        href: item.hw_rechnung_pdf_signed_url,
      });
    }
    return rows;
  }, [
    item.hw_angebot_anhang_signed_urls,
    item.hw_angebot_pdf_signed_url,
    item.hw_eingereicht_at,
    item.hw_rechnung_pdf_signed_url,
    item.hw_rechnung_eingereicht_at,
  ]);

  function handleAngebotPdfChange(files: File[]) {
    const list = files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
    const err = validatePartnerAngebotFiles(list, { required: true });
    if (err) {
      setPdfError(err);
      setAngebotPdfs([]);
      return;
    }
    setPdfError(null);
    setAngebotPdfs(list);
  }

  function handleRechnungPdfChange(files: File[]) {
    const file = files[0] ?? null;
    if (!file) {
      setRechnungPdf(null);
      return;
    }
    const err = validatePartnerPdfFile(file);
    if (err) {
      setRechnungError(err);
      setRechnungPdf(null);
      return;
    }
    setRechnungError(null);
    setRechnungPdf(file);
  }

  async function onPdfSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePartnerAngebotFiles(angebotPdfs, { required: true });
    if (err) {
      setPdfError(err);
      return;
    }
    setPdfLoading(true);
    setPdfError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    for (const pdf of angebotPdfs) fd.append("pdfs", pdf);
    const res = await submitPartnerAngebotPdf(fd);
    setPdfLoading(false);
    if (!res.ok) {
      setPdfError(res.error);
      return;
    }
    router.refresh();
  }

  async function onRechnungSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pdf = rechnungPdf;
    const pdfErr = validatePartnerPdfFile(pdf);
    if (pdfErr || !pdf) {
      setRechnungError(pdfErr ?? "Bitte ein Rechnungs-PDF auswählen.");
      return;
    }
    setRechnungLoading(true);
    setRechnungError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("pdf", pdf);
    const res = await submitPartnerRechnung(fd);
    setRechnungLoading(false);
    if (!res.ok) {
      setRechnungError(res.error);
      return;
    }
    router.refresh();
  }

  const actionFooter = kannPdfHochladen ? (
    <PartnerDetailStickyActions
      primaryLabel="PDF speichern"
      primaryType="submit"
      primaryForm={PDF_FORM_ID}
      primaryLoading={pdfLoading}
    />
  ) : kannRechnungHochladen ? (
    <PartnerDetailStickyActions
      primaryLabel="Rechnung absenden"
      primaryType="submit"
      primaryForm={RECHNUNG_FORM_ID}
      primaryLoading={rechnungLoading}
    />
  ) : undefined;

  return (
    <PartnerDetailLayout footer={actionFooter}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerDetailDateMetaLine(item.antwort_at ?? item.gesendet_at)}
        statusLabel={hwStatusLabel(item.hw_status)}
        statusPillClass={partnerDetailStatusPillClass(item.hw_status ?? "uebernommen")}
      />

      {vertragspaketAktiv ? (
        <PartnerDetailInfoBox>
          Die Preise sind vereinbart. Bitte bestätige den Projektvertrag — danach wird der Auftrag
          freigeschaltet. Ein Angebots-PDF kannst du optional hochladen.
        </PartnerDetailInfoBox>
      ) : uebernommen && vertragBestaetigt ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Auftrag bestätigt</p>
          <p className="text-sm">Du findest das laufende Projekt unter „Aufträge“.</p>
        </PartnerDetailSuccessBox>
      ) : kannRechnungHochladen ? (
        <PartnerDetailInfoBox>
          Nach Abschluss der Leistung kannst du hier deine Rechnung als PDF einreichen.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title={PARTNER_LEISTUNGEN_SECTION_TITLE}>
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="readonly"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      {item.hw_konditionen ? (
        <p className="portal-text-meta text-text-secondary">
          Vereinbart am {fmtPartnerDate(item.hw_eingereicht_at)}
          {item.hw_konditionen.art === "gegenvorschlag" ? " · Gegenvorschlag" : " · Konditionen bestätigt"}
        </p>
      ) : null}

      {kannPdfHochladen ? (
        <form id={PDF_FORM_ID} onSubmit={onPdfSubmit} className="space-y-3">
          <FileUploadField
            label="Angebots-PDF (optional)"
            accept="application/pdf,.pdf"
            multiple
            hint={`Optional. Max. ${PARTNER_MAX_ANGEBOT_DATEIEN} PDFs, je ${PARTNER_MAX_PDF_MB} MB`}
            selectedName={
              angebotPdfs.length > 0
                ? angebotPdfs.length === 1
                  ? angebotPdfs[0].name
                  : `${angebotPdfs.length} PDFs ausgewählt`
                : null
            }
            onChange={handleAngebotPdfChange}
          />
          {pdfError ? <PartnerDetailError message={pdfError} /> : null}
        </form>
      ) : null}

      {vertragspaketAktiv && item.auftrag_id ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
        />
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {kannRechnungHochladen ? (
        <form
          id={RECHNUNG_FORM_ID}
          onSubmit={onRechnungSubmit}
          className="space-y-3 rounded-xl border border-border-light p-4"
        >
          <p className="portal-text-section">Rechnung hochladen</p>
          <FileUploadField
            label="Rechnungs-PDF"
            accept="application/pdf,.pdf"
            hint={`PDF, max. ${PARTNER_MAX_PDF_MB} MB`}
            selectedName={rechnungPdf?.name}
            onChange={handleRechnungPdfChange}
          />
          {rechnungError ? <PartnerDetailError message={rechnungError} /> : null}
        </form>
      ) : null}

      {rechnungEingereicht ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Rechnung eingereicht</p>
          <p className="text-sm">
            Hochgeladen am {fmtPartnerDate(item.hw_rechnung_eingereicht_at)}
          </p>
        </PartnerDetailSuccessBox>
      ) : null}
    </PartnerDetailLayout>
  );
}
