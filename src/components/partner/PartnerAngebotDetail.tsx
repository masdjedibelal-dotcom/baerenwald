"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { PartnerAngebotAuftragAnnehmen } from "@/components/partner/PartnerAngebotAuftragAnnehmen";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailLayout,
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import {
  DokumenteTabelle,
  type DokumentZeile,
} from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import {
  partnerAngebotPortalStatusLabel,
  partnerAngebotPortalStatusPillKey,
  resolvePartnerAngebotPortalPhase,
} from "@/lib/partner/partner-angebot-portal-status";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import { partnerAngebotStatusPillClass } from "@/lib/partner/partner-list-mappers";
import {
  buildPartnerAngebotPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import { mapKonditionZeilenVereinbart, konditionZeilenNurAusHw } from "@/lib/partner/partner-konditionen";
import { isPartnerAnfrageKonditionenNachreichung } from "@/lib/partner/partner-anfrage-status";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

const PDF_FORM_ID = "partner-angebot-pdf-form";
const RECHNUNG_FORM_ID = "partner-rechnung-form";

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);

  const nachreichung = isPartnerAnfrageKonditionenNachreichung(item);
  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  const uebernommen = hwSt === "uebernommen";
  const phase = resolvePartnerAngebotPortalPhase(item);
  const wartetAufFreigabe = phase === "wartet_auf_freigabe";
  const auftragFreigegeben = phase === "auftrag_freigegeben";
  const angenommen = phase === "angenommen";
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const hatPdf = Boolean(
    item.hw_angebot_pdf_url ||
      item.hw_angebot_pdf_signed_url ||
      item.hw_angebot_anhang_urls?.length
  );
  const kannPdfHochladen = uebernommen && wartetAufFreigabe && !hatPdf;
  const kannRechnungHochladen = uebernommen && angenommen && !rechnungEingereicht;

  const konditionZeilen = useMemo(() => {
    if (nachreichung && item.hw_konditionen?.positionen.length) {
      return mapKonditionZeilenVereinbart(konditionZeilenNurAusHw(item.hw_konditionen));
    }
    const zeilen = resolvePartnerKonditionZeilen(
      item.crm_positionen_raw,
      { gewerkId: item.gewerk_id },
      item.hw_konditionen
    );
    if (!uebernommen) return zeilen;
    return mapKonditionZeilenVereinbart(zeilen);
  }, [
    item.crm_positionen_raw,
    item.gewerk_id,
    item.hw_konditionen,
    uebernommen,
    nachreichung,
  ]);

  const sections = useMemo(
    () =>
      buildPartnerAngebotPortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const rv = item.rahmenvertrag;
    const rvHref = rv?.pdf_signed_url?.trim() || rv?.pdf_url?.trim();
    if (rvHref) {
      rows.push({
        id: "rahmenvertrag",
        datum: rv?.signiert_am ?? rv?.portal_akzeptiert_am,
        name: "Partnerschafts-Rahmenvertrag",
        href: rvHref,
      });
    }
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
    item.rahmenvertrag,
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

  const statusLabel = partnerAngebotPortalStatusLabel(item);
  const statusPillKey = partnerAngebotPortalStatusPillKey(item);

  const actionFooter = auftragFreigegeben ? (
    <PartnerAngebotAuftragAnnehmen item={item} footer />
  ) : undefined;

  return (
    <PartnerDetailLayout footer={actionFooter}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerDetailDateMetaLine(item.antwort_at ?? item.gesendet_at)}
        statusLabel={statusLabel}
        statusPillClass={partnerAngebotStatusPillClass(statusPillKey)}
      />

      {nachreichung ? (
        <PartnerDetailInfoBox>
          Bärenwald hat eine neue Leistung ergänzt — bitte unter „Anfragen“ prüfen und
          den Preis senden. Hier siehst du die bereits angenommenen Leistungen.
        </PartnerDetailInfoBox>
      ) : wartetAufFreigabe ? (
        <PartnerDetailInfoBox>
          Warte auf Freigabe. Optional Angebots-PDF hochladen.
        </PartnerDetailInfoBox>
      ) : auftragFreigegeben ? (
        <PartnerDetailInfoBox>
          Rahmenvertrag prüfen, Unterlagen hochladen, Auftrag annehmen.
        </PartnerDetailInfoBox>
      ) : angenommen ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Auftrag angenommen</p>
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

      {item.hw_eingereicht_at ? (
        <p className="portal-text-meta text-text-secondary">
          Vereinbart am {fmtPartnerDate(item.hw_eingereicht_at)}
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
          {angebotPdfs.length > 0 ? (
            <button
              type="submit"
              disabled={pdfLoading}
              className="btn-pill-outline portal-btn !px-4 !py-2.5"
            >
              {pdfLoading ? "Wird hochgeladen…" : "PDF hochladen"}
            </button>
          ) : null}
        </form>
      ) : null}

      {auftragFreigegeben ? <PartnerAngebotAuftragAnnehmen item={item} /> : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
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
          <button
            type="submit"
            disabled={rechnungLoading || !rechnungPdf}
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
          >
            {rechnungLoading ? "Wird gesendet…" : "Rechnung absenden"}
          </button>
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
