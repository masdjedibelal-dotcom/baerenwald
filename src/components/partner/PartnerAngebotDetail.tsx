"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  submitPartnerAngebot,
  submitPartnerRechnung,
} from "@/app/actions/partner-angebote";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailKeyValues,
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
  PartnerDetailStickyActions,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import {
  DokumenteTabelle,
  type DokumentZeile,
} from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  fmtPartnerDate,
  fmtPartnerEuro,
  fmtPartnerMetaLine,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  PARTNER_MAX_PDF_MB,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

const ANGEBOT_FORM_ID = "partner-angebot-form";
const RECHNUNG_FORM_ID = "partner-rechnung-form";

function hwStatusLabel(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "eingereicht") return "Eingereicht";
  if (v === "uebernommen") return "Übernommen";
  if (v === "abgelehnt") return "Abgelehnt";
  return "Offen";
}

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [angebotLoading, setAngebotLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [angebotError, setAngebotError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [preisNetto, setPreisNetto] = useState("");
  const [preisBrutto, setPreisBrutto] = useState("");
  const [notiz, setNotiz] = useState("");
  const [angebotPdf, setAngebotPdf] = useState<File | null>(null);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  const [confirmAngebot, setConfirmAngebot] = useState(false);

  const eingereicht = Boolean(item.hw_eingereicht_at);
  const uebernommen = (item.hw_status ?? "").toLowerCase() === "uebernommen";
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const kannAngebotEinreichen =
    !eingereicht && item.status.toLowerCase() === "akzeptiert";
  const wartetAufFreigabe = eingereicht && !uebernommen;
  const kannRechnungHochladen = eingereicht && uebernommen && !rechnungEingereicht;

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    if (item.hw_angebot_pdf_signed_url) {
      rows.push({
        id: "hw-angebot-pdf",
        datum: item.hw_eingereicht_at,
        name: "Angebot (eingereicht)",
        href: item.hw_angebot_pdf_signed_url,
      });
    }
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
    item.hw_angebot_pdf_signed_url,
    item.hw_eingereicht_at,
    item.hw_rechnung_pdf_signed_url,
    item.hw_rechnung_eingereicht_at,
  ]);

  function parseNettoInput(raw: string): number | null {
    const n = Number(raw.replace(",", ".").trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  function handleAngebotPdfChange(files: File[]) {
    const file = files[0] ?? null;
    if (!file) {
      setAngebotPdf(null);
      return;
    }
    const err = validatePartnerPdfFile(file);
    if (err) {
      setAngebotError(err);
      setAngebotPdf(null);
      return;
    }
    setAngebotError(null);
    setAngebotPdf(file);
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

  async function sendAngebot() {
    const pdf = angebotPdf;
    const pdfErr = validatePartnerPdfFile(pdf);
    if (pdfErr || !pdf) {
      setAngebotError(pdfErr ?? "Bitte ein Angebots-PDF auswählen.");
      return;
    }
    if (parseNettoInput(preisNetto) == null) {
      setAngebotError("Bitte einen gültigen Netto-Preis in Euro angeben.");
      return;
    }
    setAngebotLoading(true);
    setAngebotError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("preisNetto", preisNetto);
    fd.set("preisBrutto", preisBrutto);
    fd.set("notiz", notiz);
    fd.set("pdf", pdf);
    const res = await submitPartnerAngebot(fd);
    setAngebotLoading(false);
    setConfirmAngebot(false);
    if (!res.ok) {
      setAngebotError(res.error);
      return;
    }
    router.refresh();
  }

  function onAngebotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAngebotError(null);
    if (parseNettoInput(preisNetto) == null) {
      setAngebotError("Bitte einen gültigen Netto-Preis in Euro angeben.");
      return;
    }
    const pdfErr = validatePartnerPdfFile(angebotPdf);
    if (pdfErr) {
      setAngebotError(pdfErr);
      return;
    }
    setConfirmAngebot(true);
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

  const leistungen = item.positionen.map((p, i) => ({
    id: String(i),
    title: p.beschreibung,
    meta: [p.menge, p.einheit].filter(Boolean).join(" "),
  }));

  const footer = kannAngebotEinreichen ? (
    <PartnerDetailStickyActions
      primaryLabel="Angebot absenden"
      primaryType="submit"
      primaryForm={ANGEBOT_FORM_ID}
      primaryLoading={angebotLoading}
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
    <PartnerDetailLayout footer={footer}>
      <PartnerDetailHero
        title={item.angebot_titel || item.gewerk_name}
        metaLine={fmtPartnerMetaLine({
          plz: item.plz,
          ort: item.ort,
          date: item.antwort_at ?? item.gesendet_at,
        })}
        statusLabel={hwStatusLabel(item.hw_status)}
        statusPillClass={partnerDetailStatusPillClass(item.hw_status ?? "offen")}
        subtitle={item.gewerk_name}
      />

      {kannAngebotEinreichen ? (
        <PartnerDetailInfoBox>
          Trage Netto-Preis und Angebots-PDF ein. Nach dem Absenden kann das Angebot nicht mehr
          geändert werden — Bärenwald erhält eine E-Mail mit deinen Angaben.
        </PartnerDetailInfoBox>
      ) : wartetAufFreigabe ? (
        <PartnerDetailInfoBox>
          Dein Angebot wurde eingereicht und wird von Bärenwald geprüft. Du erhältst eine E-Mail,
          sobald wir es übernommen haben.
        </PartnerDetailInfoBox>
      ) : uebernommen ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Angebot übernommen</p>
          <p className="text-sm">
            Bärenwald hat dein Angebot bestätigt. Vielen Dank — bei laufenden Projekten findest du
            Details unter Aufträge.
          </p>
        </PartnerDetailSuccessBox>
      ) : eingereicht && kannRechnungHochladen ? (
        <PartnerDetailInfoBox>
          Nach Abschluss der Leistung kannst du hier deine Rechnung als PDF einreichen.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerDetailSection title="Beschreibung">
        <PartnerDetailKeyValues
          rows={[
            { label: "Gewerk", value: item.gewerk_name },
            { label: "Zeitraum", value: item.zeitraum },
            {
              label: "Angenommen am",
              value: item.antwort_at ? fmtPartnerDate(item.antwort_at) : null,
            },
          ]}
        />
      </PartnerDetailSection>

      {leistungen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PartnerDetailLeistungenList items={leistungen} />
        </PartnerDetailSection>
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {eingereicht ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Eingereichte Preise</p>
          <p>
            <span className="text-emerald-800/70">Angebot eingereicht am:</span>{" "}
            {fmtPartnerDate(item.hw_eingereicht_at)}
          </p>
          <p>
            <span className="text-emerald-800/70">Netto:</span> {fmtPartnerEuro(item.hw_preis_netto)}
          </p>
          <p>
            <span className="text-emerald-800/70">Brutto:</span>{" "}
            {fmtPartnerEuro(item.hw_preis_brutto)}
          </p>
          {item.hw_notiz ? (
            <p>
              <span className="text-emerald-800/70">Notiz:</span> {item.hw_notiz}
            </p>
          ) : null}
          {rechnungEingereicht ? (
            <p>
              <span className="text-emerald-800/70">Rechnung hochgeladen am:</span>{" "}
              {fmtPartnerDate(item.hw_rechnung_eingereicht_at)}
            </p>
          ) : null}
        </PartnerDetailSuccessBox>
      ) : null}

      {kannAngebotEinreichen ? (
        <form
          id={ANGEBOT_FORM_ID}
          onSubmit={onAngebotSubmit}
          className="space-y-3 rounded-xl border border-border-light p-4"
        >
          <p className="portal-text-section">Angebot einreichen</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block portal-text-body sm:col-span-1">
              <span className="text-text-tertiary">
                Preis netto (€) <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={preisNetto}
                onChange={(e) => setPreisNetto(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                placeholder="z. B. 4500"
              />
            </label>
            <label className="block portal-text-body sm:col-span-1">
              <span className="text-text-tertiary">Preis brutto (€, optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={preisBrutto}
                onChange={(e) => setPreisBrutto(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                placeholder="z. B. 5355"
              />
            </label>
          </div>
          <FileUploadField
            label="Angebots-PDF"
            accept="application/pdf,.pdf"
            hint={`PDF, max. ${PARTNER_MAX_PDF_MB} MB`}
            selectedName={angebotPdf?.name}
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
          {angebotError ? <PartnerDetailError message={angebotError} /> : null}
        </form>
      ) : null}

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

      <PartnerConfirmDialog
        open={confirmAngebot}
        title="Angebot an Bärenwald senden?"
        description="Netto-Preis und PDF werden übermittelt. Bärenwald erhält eine E-Mail mit deinen Angaben und dem Angebots-PDF."
        confirmLabel="Ja, absenden"
        loading={angebotLoading}
        onConfirm={sendAngebot}
        onCancel={() => setConfirmAngebot(false)}
      />

      {!kannAngebotEinreichen && !eingereicht ? (
        <p className="portal-text-body text-text-secondary">
          Diese Anfrage ist noch nicht angenommen. Bitte zuerst unter „Anfragen“ antworten.
        </p>
      ) : null}
    </PartnerDetailLayout>
  );
}
