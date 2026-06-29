"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import {
  createPartnerBautagebuchEintrag,
  deletePartnerBautagebuchEintrag,
  updatePartnerBautagebuchEintrag,
} from "@/app/actions/partner-bautagebuch";
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
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { buildBauauftragComplianceItems, isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import {
  buildPartnerAuftragDokumentZeilen,
  partnerAuftragKannRechnungHochladen,
  partnerAuftragKannUnterlagenHochladen,
  partnerAuftragZeigtDokumenteUpload,
} from "@/lib/partner/partner-auftrag-dokumente";
import {
  PARTNER_HW_DOKUMENT_UPLOAD_LABEL,
  partnerHwDokumentUploadHint,
} from "@/lib/partner/partner-hw-dokument-copy";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_BAUTAGEBUCH_ANHAENGE,
  PARTNER_MAX_PDF_MB,
  PARTNER_MAX_PHOTO_MB,
  validatePartnerAngebotFiles,
  validatePartnerBautagebuchFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchItem,
} from "@/lib/partner/get-partner-data";
import { PartnerStarRatingDisplay } from "@/components/partner/PartnerStarRatingDisplay";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAuftragPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerAuftragDetailMetaLine,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  durchschnittAusBewertung,
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
  isAuftragAbgeschlossen,
} from "@/lib/partner/handwerker-bewertung-display";
import {
  partnerAuftragListenStatusLabel,
  partnerAuftragListenStatusPillKey,
} from "@/lib/partner/partner-auftrag-list-status";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangState,
} from "@/lib/partner/vorgang-state";
import { cn } from "@/lib/utils";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";

function BautagebuchForm({
  auftragId,
  eintrag,
  onDone,
}: {
  auftragId: string;
  eintrag?: PartnerBautagebuchItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titel, setTitel] = useState(eintrag?.titel ?? "");
  const [beschreibung, setBeschreibung] = useState(eintrag?.beschreibung ?? "");
  const [datum, setDatum] = useState(
    eintrag?.datum ?? new Date().toISOString().slice(0, 10)
  );
  const [anhaenge, setAnhaenge] = useState<File[]>([]);

  const bestehendeAnzahl = eintrag?.foto_urls.length ?? 0;

  function handleAnhaengeChange(files: File[]) {
    const maxNeu = Math.max(0, PARTNER_MAX_BAUTAGEBUCH_ANHAENGE - bestehendeAnzahl);
    const list = files.slice(0, maxNeu);
    const err = validatePartnerBautagebuchFiles(list, bestehendeAnzahl);
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
    if (eintrag) {
      fd.set("eintragId", eintrag.id);
      fd.set("keepFotoPaths", eintrag.foto_urls.join(","));
    }
    fd.set("titel", titel);
    fd.set("beschreibung", beschreibung);
    fd.set("datum", datum);
    for (const f of anhaenge) fd.append("photos", f);

    const res = eintrag
      ? await updatePartnerBautagebuchEintrag(fd)
      : await createPartnerBautagebuchEintrag(fd);

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="portal-text-body space-y-3 rounded-xl border border-border-light bg-muted/15 p-4"
    >
      <p className="font-semibold text-text-primary">
        {eintrag ? "Eintrag bearbeiten" : "Neuer Bautagebuch-Eintrag"}
      </p>
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Titel</span>
        <input
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
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
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Beschreibung</span>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={3}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <FileUploadField
        label="Fotos & Dokumente"
        hint={
          eintrag
            ? `Neue Dateien werden ergänzt (max. ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} gesamt, davon ${bestehendeAnzahl} bereits). Fotos max. ${PARTNER_MAX_PHOTO_MB} MB, PDF max. ${PARTNER_MAX_PDF_MB} MB.`
            : `Fotos (JPG/PNG/WebP, max. ${PARTNER_MAX_PHOTO_MB} MB) oder PDF (max. ${PARTNER_MAX_PDF_MB} MB), bis ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} Dateien.`
        }
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
        multiple
        selectedName={
          anhaenge.length > 0
            ? anhaenge.length === 1
              ? anhaenge[0].name
              : `${anhaenge.length} Dateien ausgewählt`
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
          className={cn("btn-pill-primary portal-btn !px-4 !py-2.5", loading && "opacity-60")}
        >
          {loading ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="portal-text-body text-text-secondary underline-offset-2 hover:underline"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function BautagebuchEintragActions({
  auftragId,
  eintrag,
  onEdit,
}: {
  auftragId: string;
  eintrag: PartnerBautagebuchItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeleting(true);
    setError(null);
    const res = await deletePartnerBautagebuchEintrag({
      auftragId,
      eintragId: eintrag.id,
    });
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (!eintrag.own || eintrag.fuer_kunde_freigegeben) return null;

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        className="portal-text-meta font-medium text-accent underline-offset-2 hover:underline"
      >
        Bearbeiten
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={onDelete}
        className="portal-text-meta font-medium text-red-700 underline-offset-2 hover:underline"
      >
        Löschen
      </button>
      {error ? <p className="w-full portal-text-meta text-red-700">{error}</p> : null}
    </>
  );
}

export function PartnerAuftragDetail({
  item,
  vorgangState,
}: {
  item: PartnerAuftragItem;
  vorgangState?: VorgangState;
}) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [angebotPdfs, setAngebotPdfs] = useState<File[]>([]);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);

  const kannUnterlagenHochladen = partnerAuftragKannUnterlagenHochladen(item);
  const kannRechnungHochladen = partnerAuftragKannRechnungHochladen(item);
  const zeigtDokumenteUpload = partnerAuftragZeigtDokumenteUpload(item);
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);

  const accordionEintraege = useMemo(
    () =>
      item.bautagebuch.map((e) => ({
        id: e.id,
        datum: e.datum,
        titel: e.titel,
        beschreibung: e.beschreibung,
        fotos: e.foto_signed_urls,
        badges: (
          <>
            {e.own ? (
              <span className="tag bg-accent-light text-accent">Dein Eintrag</span>
            ) : null}
            {e.fuer_kunde_freigegeben ? (
              <span className="tag bg-emerald-100 text-emerald-700">Freigegeben</span>
            ) : null}
          </>
        ),
        actions:
          e.own && !e.fuer_kunde_freigegeben ? (
            <BautagebuchEintragActions
              auftragId={item.id}
              eintrag={e}
              onEdit={() => setEditId(e.id)}
            />
          ) : undefined,
      })),
    [item.bautagebuch, item.id]
  );

  const editingEintrag = editId
    ? item.bautagebuch.find((e) => e.id === editId)
    : undefined;

  const sections = useMemo(
    () => buildPartnerAuftragPortalSections(item.lead),
    [item.lead]
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
            item.vertrag.compliance_projekt
          )
        : [],
    [item.vertrag]
  );
  const dokumentZeilen = useMemo(() => buildPartnerAuftragDokumentZeilen(item), [item]);

  async function onPdfSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setRechnungPdf(null);
    router.refresh();
  }
  const statusLabel = vorgangState
    ? vorgangStateLabel(vorgangState)
    : partnerAuftragListenStatusLabel(item.status);
  const statusPillKey = vorgangState
    ? vorgangStatePillKey(vorgangState)
    : partnerAuftragListenStatusPillKey(item.status);

  return (
    <PartnerDetailLayout>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerAuftragDetailMetaLine(item.start_datum, item.end_datum)}
        statusLabel={statusLabel}
        statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
      />

      {item.bautagebuchAnfrageOffen ? (
        <PartnerDetailInfoBox>
          Bärenwald hat einen <strong>Tagebucheintrag</strong> angefordert. Bitte unten im
          Bautagebuch dokumentieren.
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

      {isAuftragAbgeschlossen(item.status) ? (
        <PartnerDetailSection title="Deine Bewertung">
          {item.bewertung ? (
            <div className="space-y-4">
              <ul className="space-y-3">
                {HANDWERKER_BEWERTUNG_KATEGORIEN.map((kat) => (
                  <li
                    key={kat.key}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="portal-text-body text-text-primary">
                      {kat.label}
                    </span>
                    <PartnerStarRatingDisplay
                      value={item.bewertung![kat.key]}
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
              <p className="portal-text-body font-semibold text-text-primary">
                Ø {formatHandwerkerBewertung(durchschnittAusBewertung(item.bewertung))}
              </p>
              {item.bewertung.updated_at ? (
                <p className="portal-text-meta text-text-secondary">
                  Bewertet am {fmtPartnerDate(item.bewertung.updated_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="portal-text-body text-text-secondary">
              Noch keine Bewertung für diesen Auftrag.
            </p>
          )}
        </PartnerDetailSection>
      ) : null}

      <div className="space-y-3 border-t border-border-light pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="portal-text-section">Bautagebuch</p>
          {!showNew && !editingEintrag ? (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-pill-outline portal-btn-compact !px-3"
            >
              + Eintrag
            </button>
          ) : null}
        </div>
        <p className="portal-text-meta text-text-secondary">
          Einträge werden von Bärenwald geprüft, bevor sie für Kunden sichtbar werden.
        </p>

        {showNew ? (
          <BautagebuchForm auftragId={item.id} onDone={() => setShowNew(false)} />
        ) : null}

        {editingEintrag ? (
          <BautagebuchForm
            auftragId={item.id}
            eintrag={editingEintrag}
            onDone={() => setEditId(null)}
          />
        ) : null}

        <BautagebuchAccordionList
          eintraege={accordionEintraege}
          className="!border-t-0 !pt-0"
          emptyText="Noch keine Einträge im Bautagebuch."
        />
      </div>

      <PartnerDetailSection title="Unterlagen">
        <DokumenteTabelle
          dokumente={dokumentZeilen}
          heading=""
          emptyText="Noch keine Unterlagen hochgeladen."
          className="!border-t-0 !pt-0"
        />

        {zeigtDokumenteUpload ? (
          <div className="mt-4 space-y-4">
            {kannUnterlagenHochladen ? (
              <form
                onSubmit={onPdfSubmit}
                className="space-y-2 rounded-xl border border-dashed border-border-light p-4"
              >
                <FileUploadField
                  label={PARTNER_HW_DOKUMENT_UPLOAD_LABEL}
                  accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                  multiple
                  hint={partnerHwDokumentUploadHint()}
                  selectedName={
                    angebotPdfs.length > 0
                      ? angebotPdfs.length === 1
                        ? angebotPdfs[0].name
                        : `${angebotPdfs.length} Dateien`
                      : null
                  }
                  onChange={(files) => {
                    const list = files.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
                    const err = validatePartnerAngebotFiles(list, { required: false });
                    setPdfError(err);
                    setAngebotPdfs(err ? [] : list);
                  }}
                />
                {pdfError ? <PartnerDetailError message={pdfError} /> : null}
                {angebotPdfs.length > 0 ? (
                  <button
                    type="submit"
                    disabled={pdfLoading}
                    className="btn-pill-outline portal-btn !px-4 !py-2.5"
                  >
                    {pdfLoading ? "Wird hochgeladen…" : "Hochladen"}
                  </button>
                ) : null}
              </form>
            ) : null}

            {kannRechnungHochladen ? (
              <form
                onSubmit={onRechnungSubmit}
                className="space-y-2 rounded-xl border border-border-light p-4"
              >
                <p className="portal-text-body font-semibold text-text-primary">
                  Rechnung einreichen
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
          title="Checkliste Bauprojekt"
          items={bauauftragUnterlagen}
          auftragId={item.id}
          gruppiert
        />
      ) : null}
    </PartnerDetailLayout>
  );
}
