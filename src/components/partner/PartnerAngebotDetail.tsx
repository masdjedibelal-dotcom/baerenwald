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
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
  PartnerDetailStickyActions,
  PartnerDetailSuccessBox,
  PartnerJobFieldActions,
} from "@/components/partner/PartnerDetailUi";
import { partnerMapsHref } from "@/lib/partner/partner-maps-href";
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
  fmtPartnerEuro,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAngebotPortalSections,
  partnerDetailDateMetaLine,
  resolvePartnerAngebotPositionen,
} from "@/lib/partner/partner-portal-display";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";

const ANGEBOT_FORM_ID = "partner-angebot-form";
const RECHNUNG_FORM_ID = "partner-rechnung-form";
const PARTNER_ANGEBOT_MWST = 19;

type PartnerPreisArt = "netto" | "brutto";

function parsePreisInput(raw: string): number | null {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function roundEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

function bruttoFromNetto(netto: number, mwst = PARTNER_ANGEBOT_MWST): number {
  return roundEuro(netto * (1 + mwst / 100));
}

function nettoFromBrutto(brutto: number, mwst = PARTNER_ANGEBOT_MWST): number {
  return roundEuro(brutto / (1 + mwst / 100));
}

function resolvePartnerAngebotPreise(
  raw: string,
  art: PartnerPreisArt
): { netto: number; brutto: number } | null {
  const parsed = parsePreisInput(raw);
  if (parsed == null) return null;
  if (art === "netto") {
    return { netto: parsed, brutto: bruttoFromNetto(parsed) };
  }
  return { netto: nettoFromBrutto(parsed), brutto: parsed };
}

function hwStatusLabel(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "eingereicht") return "In Prüfung";
  if (v === "uebernommen") return "Übernommen";
  if (v === "abgelehnt") return "Abgelehnt";
  if (v === "rueckfrage") return "Rückfrage";
  return "Offen";
}

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [angebotLoading, setAngebotLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [angebotError, setAngebotError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [preisEingabe, setPreisEingabe] = useState("");
  const [preisArt, setPreisArt] = useState<PartnerPreisArt>("netto");
  const [notiz, setNotiz] = useState("");
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  const [confirmAngebot, setConfirmAngebot] = useState(false);

  const hwSt = (item.hw_status ?? "offen").toLowerCase();
  const eingereicht = hwSt === "eingereicht";
  const uebernommen = hwSt === "uebernommen";
  const crmRueckfrage = hwSt === "rueckfrage";
  const crmAbgelehnt = hwSt === "abgelehnt";
  const vertragBestaetigt = Boolean(item.projektvertrag_bestaetigt_am);
  const vertragspaketAktiv = uebernommen && !vertragBestaetigt;
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const kannAngebotEinreichen =
    item.status.toLowerCase() === "akzeptiert" &&
    (hwSt === "offen" || crmRueckfrage || crmAbgelehnt);
  const wartetAufFreigabe = eingereicht;
  const hatEinreichung =
    Boolean(item.hw_eingereicht_at) &&
    (eingereicht || uebernommen || crmRueckfrage || crmAbgelehnt);
  const kannRechnungHochladen =
    uebernommen && vertragBestaetigt && !rechnungEingereicht;

  const { positionen: crmPositionen, gesamtBrutto } = useMemo(
    () =>
      resolvePartnerAngebotPositionen(item.crm_positionen_raw, {
        gesamt_fix: item.crm_gesamt_fix,
        gesamt_min: item.crm_gesamt_min,
        gesamt_max: item.crm_gesamt_max,
      }),
    [
      item.crm_positionen_raw,
      item.crm_gesamt_fix,
      item.crm_gesamt_min,
      item.crm_gesamt_max,
    ]
  );

  const sections = useMemo(
    () =>
      buildPartnerAngebotPortalSections(item.lead, {
        gewerk_name: item.gewerk_name,
        zeitraum: item.zeitraum,
      }),
    [item.lead, item.gewerk_name, item.zeitraum]
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
            ? `Angebot PDF ${i + 1}`
            : "Angebot (eingereicht)",
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

  const preisVorschau = useMemo(
    () => resolvePartnerAngebotPreise(preisEingabe, preisArt),
    [preisEingabe, preisArt]
  );

  function parseNettoInput(raw: string): number | null {
    return resolvePartnerAngebotPreise(raw, preisArt)?.netto ?? null;
  }

  function handleAngebotPdfChange(files: File[]) {
    const list = files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
    const err = validatePartnerAngebotFiles(list);
    if (err) {
      setAngebotError(err);
      setAngebotPdfs([]);
      return;
    }
    setAngebotError(null);
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

  async function sendAngebot() {
    const pdfErr = validatePartnerAngebotFiles(angebotPdfs);
    if (pdfErr) {
      setAngebotError(pdfErr);
      return;
    }
    if (parseNettoInput(preisEingabe) == null) {
      setAngebotError("Bitte einen gültigen Preis in Euro angeben.");
      return;
    }
    setAngebotLoading(true);
    setAngebotError(null);
    const preise = resolvePartnerAngebotPreise(preisEingabe, preisArt)!;
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("preisNetto", String(preise.netto));
    fd.set("preisBrutto", String(preise.brutto));
    fd.set("notiz", notiz);
    for (const pdf of angebotPdfs) fd.append("pdfs", pdf);
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
    if (parseNettoInput(preisEingabe) == null) {
      setAngebotError("Bitte einen gültigen Preis in Euro angeben.");
      return;
    }
    const pdfErr = validatePartnerAngebotFiles(angebotPdfs);
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

  const hwLeistungen = item.positionen.map((p, i) => ({
    id: String(i),
    title: p.beschreibung,
    meta: [p.menge, p.einheit].filter(Boolean).join(" "),
  }));

  const actionFooter = kannAngebotEinreichen ? (
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
  const hasMaps = Boolean(
    partnerMapsHref({ lead: item.lead, plz: item.plz, ort: item.ort })
  );
  const footer =
    actionFooter || hasMaps ? (
      <div className="space-y-2">
        {hasMaps ? (
          <PartnerJobFieldActions lead={item.lead} plz={item.plz} ort={item.ort} />
        ) : null}
        {actionFooter}
      </div>
    ) : undefined;

  return (
    <PartnerDetailLayout footer={footer}>
      <PartnerDetailHero
        title={item.angebot_titel}
        metaLine={partnerDetailDateMetaLine(item.antwort_at ?? item.gesendet_at)}
        statusLabel={hwStatusLabel(item.hw_status)}
        statusPillClass={partnerDetailStatusPillClass(item.hw_status ?? "offen")}
      />

      {kannAngebotEinreichen ? (
        <PartnerDetailInfoBox>
          {crmRueckfrage || crmAbgelehnt
            ? "Bitte reiche ein aktualisiertes Angebot mit Preis und PDF ein."
            : "Trage Preis und Angebots-PDF ein. Nach dem Absenden kann das Angebot nicht mehr geändert werden — Bärenwald erhält eine E-Mail mit deinen Angaben."}
        </PartnerDetailInfoBox>
      ) : null}

      {(crmRueckfrage || crmAbgelehnt) && item.hw_crm_notiz?.trim() ? (
        <PartnerDetailInfoBox>
          <p className="font-semibold">
            {crmRueckfrage ? "Rückfrage von Bärenwald" : "Angebot nicht übernommen"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.hw_crm_notiz.trim()}</p>
        </PartnerDetailInfoBox>
      ) : wartetAufFreigabe ? (
        <PartnerDetailInfoBox>
          Dein Angebot wurde eingereicht und wird von Bärenwald geprüft. Du erhältst eine E-Mail,
          sobald wir es übernommen haben.
        </PartnerDetailInfoBox>
      ) : vertragspaketAktiv ? (
        <PartnerDetailInfoBox>
          Bärenwald hat dein Angebot übernommen. Bitte bestätige den Projektvertrag — erst danach
          wird der Auftrag freigeschaltet.
        </PartnerDetailInfoBox>
      ) : uebernommen && vertragBestaetigt ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Auftrag bestätigt</p>
          <p className="text-sm">
            Du findest das laufende Projekt unter „Aufträge“.
          </p>
        </PartnerDetailSuccessBox>
      ) : uebernommen && kannRechnungHochladen ? (
        <PartnerDetailInfoBox>
          Nach Abschluss der Leistung kannst du hier deine Rechnung als PDF einreichen.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerPortalDetailSections
        sections={sections}
        angebotPositionen={crmPositionen}
        gesamtBrutto={gesamtBrutto}
      />

      {vertragspaketAktiv && item.auftrag_id ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          complianceStamm={[]}
          complianceProjekt={[]}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          variant="angebot"
        />
      ) : null}

      {hwLeistungen.length > 0 ? (
        <PartnerDetailSection title="Dein Gewerk">
          <PartnerDetailLeistungenList items={hwLeistungen} />
        </PartnerDetailSection>
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {hatEinreichung && !kannAngebotEinreichen ? (
        <PartnerDetailSuccessBox>
          <p className="font-semibold">
            {wartetAufFreigabe
              ? "Eingereichte Preise"
              : crmRueckfrage || crmAbgelehnt
                ? "Letzte Einreichung"
                : "Eingereichte Preise"}
          </p>
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
          <label className="block portal-text-body">
            <span className="text-text-tertiary">
              Preis (€) <span className="text-red-600">*</span>
            </span>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="decimal"
                required
                value={preisEingabe}
                onChange={(e) => setPreisEingabe(e.target.value)}
                className="w-full rounded-xl border border-border-default bg-surface-card py-2 pl-3 pr-[8.75rem] text-base"
                placeholder="z. B. 4500"
              />
              <div
                className="absolute inset-y-1 right-1 flex overflow-hidden rounded-lg border border-border-default bg-surface-muted p-0.5"
                role="group"
                aria-label="Preisart"
              >
                {(["netto", "brutto"] as const).map((art) => {
                  const aktiv = preisArt === art;
                  return (
                    <button
                      key={art}
                      type="button"
                      onClick={() => setPreisArt(art)}
                      className={`min-w-[3.75rem] rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                        aktiv
                          ? "bg-surface-card text-text-primary shadow-sm"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                      aria-pressed={aktiv}
                    >
                      {art}
                    </button>
                  );
                })}
              </div>
            </div>
            {preisVorschau ? (
              <span className="mt-1 block text-xs text-text-tertiary">
                {preisArt === "netto" ? "Brutto" : "Netto"} ({PARTNER_ANGEBOT_MWST} % MwSt.):{" "}
                {fmtPartnerEuro(
                  preisArt === "netto" ? preisVorschau.brutto : preisVorschau.netto
                )}
              </span>
            ) : null}
          </label>
          <FileUploadField
            label="Angebots-PDFs"
            accept="application/pdf,.pdf"
            multiple
            hint={`1–${PARTNER_MAX_ANGEBOT_DATEIEN} PDFs, je max. ${PARTNER_MAX_PDF_MB} MB`}
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
        description={
          preisVorschau
            ? `${preisArt === "netto" ? "Netto" : "Brutto"} ${fmtPartnerEuro(preisArt === "netto" ? preisVorschau.netto : preisVorschau.brutto)} und ${angebotPdfs.length > 1 ? `${angebotPdfs.length} PDFs` : "PDF"} werden übermittelt. Bärenwald erhält eine E-Mail mit deinen Angaben.`
            : `Preis und ${angebotPdfs.length > 1 ? `${angebotPdfs.length} PDFs` : "PDF"} werden übermittelt. Bärenwald erhält eine E-Mail mit deinen Angaben.`
        }
        confirmLabel="Ja, absenden"
        loading={angebotLoading}
        onConfirm={sendAngebot}
        onCancel={() => setConfirmAngebot(false)}
      />

      {!kannAngebotEinreichen && !hatEinreichung ? (
        <p className="portal-text-body text-text-secondary">
          Diese Anfrage ist noch nicht angenommen. Bitte zuerst unter „Anfragen“ antworten.
        </p>
      ) : null}
    </PartnerDetailLayout>
  );
}
