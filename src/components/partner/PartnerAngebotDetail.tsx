"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitPartnerKonditionen, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PartnerConfirmDialog,
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
  initialHwNettoInputs,
  parseHwNettoInput,
} from "@/lib/partner/partner-konditionen";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAngebotPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

const KONDITIONEN_FORM_ID = "partner-konditionen-form";
const RECHNUNG_FORM_ID = "partner-rechnung-form";

function hwStatusLabel(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "eingereicht") return "In Prüfung";
  if (v === "uebernommen") return "Übernommen";
  if (v === "abgelehnt") return "Abgelehnt";
  if (v === "rueckfrage") return "Rückfrage";
  return "Offen";
}

function zeilenGeaendert(
  zeilen: ReturnType<typeof resolvePartnerKonditionZeilen>,
  hwValues: Record<string, string>
): boolean {
  return zeilen.some((z) => {
    const hw = parseHwNettoInput(hwValues[z.id] ?? "");
    if (hw == null) return false;
    if (z.vorschlagNetto == null || z.vorschlagNetto <= 0) return hw > 0;
    return Math.abs(hw - z.vorschlagNetto) > 0.009;
  });
}

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [konditionenLoading, setKonditionenLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [konditionenError, setKonditionenError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [notiz, setNotiz] = useState("");
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  const [confirmKonditionen, setConfirmKonditionen] = useState(false);

  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  const eingereicht = hwSt === "eingereicht";
  const uebernommen = hwSt === "uebernommen";
  const crmRueckfrage = hwSt === "rueckfrage";
  const crmAbgelehnt = hwSt === "abgelehnt";
  const vertragBestaetigt = Boolean(item.projektvertrag_bestaetigt_am);
  const vertragspaketAktiv = uebernommen && !vertragBestaetigt;
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const kannKonditionenEinreichen =
    item.status.toLowerCase() === "akzeptiert" &&
    (hwSt === "offen" || crmRueckfrage || crmAbgelehnt);
  const wartetAufFreigabe = eingereicht;
  const hatEinreichung =
    Boolean(item.hw_eingereicht_at) &&
    (eingereicht || uebernommen || crmRueckfrage || crmAbgelehnt);
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

  const [hwValues, setHwValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setHwValues(initialHwNettoInputs(konditionZeilen, item.hw_konditionen));
  }, [konditionZeilen, item.hw_konditionen]);

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
        name:
          anhangSigned.length > 1
            ? `Angebots-PDF ${i + 1}`
            : "Angebots-PDF (optional)",
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

  const geaendert = useMemo(
    () => zeilenGeaendert(konditionZeilen, hwValues),
    [konditionZeilen, hwValues]
  );

  const submitLabel = geaendert ? "Gegenvorschlag senden" : "Konditionen bestätigen";

  function buildKonditionenJson(): string | null {
    const rows: Array<{ position_id: string; hw_netto: number }> = [];
    for (const z of konditionZeilen) {
      const hw = parseHwNettoInput(hwValues[z.id] ?? "");
      if (hw == null) return null;
      rows.push({ position_id: z.id, hw_netto: hw });
    }
    return JSON.stringify(rows);
  }

  function handleAngebotPdfChange(files: File[]) {
    const list = files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
    const err = validatePartnerAngebotFiles(list, { required: false });
    if (err) {
      setKonditionenError(err);
      setAngebotPdfs([]);
      return;
    }
    setKonditionenError(null);
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

  async function sendKonditionen() {
    const json = buildKonditionenJson();
    if (!json) {
      setKonditionenError("Bitte für jede Leistung einen gültigen Netto-Preis angeben.");
      return;
    }
    setKonditionenLoading(true);
    setKonditionenError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("konditionenJson", json);
    fd.set("notiz", notiz);
    for (const pdf of angebotPdfs) fd.append("pdfs", pdf);
    const res = await submitPartnerKonditionen(fd);
    setKonditionenLoading(false);
    setConfirmKonditionen(false);
    if (!res.ok) {
      setKonditionenError(res.error);
      return;
    }
    router.refresh();
  }

  function onKonditionenSubmit(e: React.FormEvent) {
    e.preventDefault();
    setKonditionenError(null);
    if (!buildKonditionenJson()) {
      setKonditionenError("Bitte für jede Leistung einen gültigen Netto-Preis angeben.");
      return;
    }
    setConfirmKonditionen(true);
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

  const actionFooter = kannKonditionenEinreichen ? (
    <PartnerDetailStickyActions
      primaryLabel={submitLabel}
      primaryType="submit"
      primaryForm={KONDITIONEN_FORM_ID}
      primaryLoading={konditionenLoading}
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
        statusPillClass={partnerDetailStatusPillClass(item.hw_status ?? "offen")}
      />

      {kannKonditionenEinreichen ? (
        <PartnerDetailInfoBox>
          {crmRueckfrage || crmAbgelehnt
            ? "Bärenwald hat einen neuen Vorschlag oder eine Rückfrage. Bitte prüfe die Preise je Leistung und bestätige oder sende einen Gegenvorschlag."
            : "Prüfe die vorgeschlagenen Konditionen je Leistung. Du kannst sie bestätigen oder einzelne Preise anpassen. Ein PDF ist optional — du kannst es auch später im Auftrag hochladen."}
        </PartnerDetailInfoBox>
      ) : null}

      {(crmRueckfrage || crmAbgelehnt) && item.hw_crm_notiz?.trim() ? (
        <PartnerDetailInfoBox>
          <p className="font-semibold">
            {crmRueckfrage ? "Rückfrage von Bärenwald" : "Konditionen nicht übernommen"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.hw_crm_notiz.trim()}</p>
        </PartnerDetailInfoBox>
      ) : wartetAufFreigabe ? (
        <PartnerDetailInfoBox>
          Deine Konditionen wurden eingereicht. Bärenwald prüft sie — du erhältst eine E-Mail,
          sobald wir sie übernommen haben.
        </PartnerDetailInfoBox>
      ) : vertragspaketAktiv ? (
        <PartnerDetailInfoBox>
          Bärenwald hat deine Konditionen übernommen. Bitte bestätige den Projektvertrag — erst
          danach wird der Auftrag freigeschaltet.
        </PartnerDetailInfoBox>
      ) : uebernommen && vertragBestaetigt ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Auftrag bestätigt</p>
          <p className="text-sm">Du findest das laufende Projekt unter „Aufträge“.</p>
        </PartnerDetailSuccessBox>
      ) : uebernommen && kannRechnungHochladen ? (
        <PartnerDetailInfoBox>
          Nach Abschluss der Leistung kannst du hier deine Rechnung als PDF einreichen.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title="Leistungen & Vergütung">
          {kannKonditionenEinreichen ? (
            <form
              id={KONDITIONEN_FORM_ID}
              onSubmit={onKonditionenSubmit}
              className="space-y-4"
            >
              <PartnerLeistungenKonditionenCard
                zeilen={konditionZeilen}
                mode="edit"
                hwValues={hwValues}
                onHwChange={(id, value) =>
                  setHwValues((prev) => ({ ...prev, [id]: value }))
                }
                gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
              />
              <FileUploadField
                label="Angebots-PDF (optional)"
                accept="application/pdf,.pdf"
                multiple
                hint={`Optional — auch später im Auftrag möglich. Max. ${PARTNER_MAX_ANGEBOT_DATEIEN} PDFs, je ${PARTNER_MAX_PDF_MB} MB`}
                selectedName={
                  angebotPdfs.length > 0
                    ? angebotPdfs.length === 1
                      ? angebotPdfs[0].name
                      : `${angebotPdfs.length} PDFs ausgewählt`
                    : null
                }
                onChange={handleAngebotPdfChange}
              />
              <label className="block portal-text-body">
                <span className="text-text-tertiary">Notiz (optional)</span>
                <textarea
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                />
              </label>
              {konditionenError ? <PartnerDetailError message={konditionenError} /> : null}
            </form>
          ) : (
            <PartnerLeistungenKonditionenCard
              zeilen={konditionZeilen}
              mode={hatEinreichung ? "eingereicht" : "vorschlag"}
              gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
            />
          )}
        </PartnerDetailSection>
      ) : null}

      {hatEinreichung && !kannKonditionenEinreichen && item.hw_konditionen ? (
        <p className="portal-text-meta text-text-secondary">
          Eingereicht am {fmtPartnerDate(item.hw_eingereicht_at)}
          {item.hw_konditionen.art === "gegenvorschlag"
            ? " · Gegenvorschlag"
            : " · Konditionen bestätigt"}
          {item.hw_notiz ? ` — ${item.hw_notiz}` : ""}
        </p>
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

      <PartnerConfirmDialog
        open={confirmKonditionen}
        title={geaendert ? "Gegenvorschlag senden?" : "Konditionen bestätigen?"}
        description={
          geaendert
            ? "Dein Gegenvorschlag je Leistung geht an Bärenwald zur Prüfung. Nach der Übernahme wird der Partnerpreis im System hinterlegt."
            : "Du bestätigst die vorgeschlagenen Konditionen von Bärenwald. Nach der Übernahme wird der Partnerpreis im System hinterlegt."
        }
        confirmLabel="Ja, absenden"
        loading={konditionenLoading}
        onConfirm={sendKonditionen}
        onCancel={() => setConfirmKonditionen(false)}
      />

      {!kannKonditionenEinreichen && !hatEinreichung ? (
        <p className="portal-text-body text-text-secondary">
          Diese Anfrage ist noch nicht angenommen. Bitte zuerst unter „Anfragen“ antworten.
        </p>
      ) : null}
    </PartnerDetailLayout>
  );
}
