"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Phone } from "lucide-react";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { createPartnerBautagebuchEintrag,
  deletePartnerBautagebuchEintrag,
  updatePartnerBautagebuchEintrag,
} from "@/app/actions/partner-bautagebuch";
import { createPartnerBefundEintrag } from "@/app/actions/partner-befund";
import { PartnerAbschlussModal } from "@/components/partner/PartnerAbschlussModal";
import { PartnerDokumentPreviewModal } from "@/components/partner/PartnerDokumentPreviewModal";
import { PartnerAuftragErledigtSection } from "@/components/partner/PartnerAuftragErledigtSection";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import { PartnerPositionLebenszyklusList } from "@/components/partner/PartnerPositionLebenszyklusList";
import {
  PartnerDetailError,
  PartnerDetailLayout,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import {
  PortalDetailCard,
  PortalDetailMetaField,
} from "@/components/shared/PortalDetailCard";
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
  fmtPartnerEuro,
} from "@/lib/partner/partner-detail-format";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import { summeKonditionNetto } from "@/lib/partner/partner-konditionen";
import {
  durchschnittAusBewertung,
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
  isAuftragAbgeschlossen,
} from "@/lib/partner/handwerker-bewertung-display";
import { resolvePartnerVorgangListenStatus } from "@/lib/partner/partner-vorgang-display";
import { partnerKannErledigtMelden } from "@/lib/partner/partner-position-erledigt";
import {
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
} from "@/lib/partner/partner-konditionen";
import { type VorgangState } from "@/lib/partner/vorgang-state";
import {
  formatHwTerminRange,
  HW_AUFTRAG_COPY,
  HW_AUFTRAG_TIMELINE,
  hwAuftragStatusLabel,
  hwAuftragStatusStyle,
  hwAuftragTimelineIndex,
} from "@/lib/portal2/hw-auftrag-detail";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { cn } from "@/lib/utils";

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
    partnerPortalToast.bautagebuchGespeichert(!eintrag);
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
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Befund</span>
        <textarea
          required
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={4}
          placeholder="z. B. Leck in Versorgungsleitung Decke Bad, Feuchtigkeit Wand …"
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
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
    partnerPortalToast.bautagebuchGeloescht();
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
  const [showBefund, setShowBefund] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
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

  const kannUnterlagenHochladen = partnerAuftragKannUnterlagenHochladen(item);
  const kannRechnungHochladen = partnerAuftragKannRechnungHochladen(item);
  const zeigtDokumenteUpload = partnerAuftragZeigtDokumenteUpload(item);
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);

  const tagebuchEintraege = useMemo(
    () => item.bautagebuch.filter((e) => e.eintrag_typ !== "befund"),
    [item.bautagebuch]
  );
  const befundEintraege = useMemo(
    () => item.bautagebuch.filter((e) => e.eintrag_typ === "befund"),
    [item.bautagebuch]
  );
  const eigenerBefund = befundEintraege.some((e) => e.own);
  const zeigtBefundBereich =
    item.lead?.hv_meldung_status === "notmassnahme" || befundEintraege.length > 0;

  const accordionEintraege = useMemo(
    () =>
      tagebuchEintraege.map((e) => ({
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
              <span className="tag bg-emerald-100 text-emerald-700">
                Im Portal sichtbar
              </span>
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
    [tagebuchEintraege, item.id]
  );

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

  const editingEintrag = editId
    ? item.bautagebuch.find((e) => e.id === editId)
    : undefined;

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

  const kannAbschluss = partnerKannErledigtMelden({
    positionen: item.positionen,
    vorgangState,
    auftragStatus: item.status,
  });

  const offeneAbschlussLeistungen = useMemo(
    () =>
      item.positionen
        .filter(
          (p) =>
            positionHandwerkerAbgeschlossen(p.handwerker_status) &&
            !positionHandwerkerErledigt(p.handwerker_status)
        )
        .map((p) => String(p.leistung_name ?? "Leistung").trim())
        .filter(Boolean),
    [item.positionen]
  );

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
  const { label: listenStatusLabel, pillKey: statusPillKey } =
    resolvePartnerVorgangListenStatus(vorgangState, item);

  const idLabel = item.id.slice(0, 8).toUpperCase();
  const titel = resolvePartnerDetailTitelFromAuftrag(item);
  const statusLabel = hwAuftragStatusLabel({
    vorgangState,
    fallback: listenStatusLabel,
  });
  const statusStyle = hwAuftragStatusStyle(statusLabel);
  const timelineIdx = hwAuftragTimelineIndex({
    vorgangState,
    auftragStatus: item.status,
  });

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
  const headerSub = [objektLine, gewerk].filter(Boolean).join(" · ");
  const beschreibung = lead?.kontakt_nachricht?.trim() || null;
  const kontaktName =
    lead?.melder_name?.trim() || lead?.kontakt_name?.trim() || null;
  const kontaktTel = lead?.melder_telefon?.trim() || null;
  const terminLabel = formatHwTerminRange(item.start_datum, item.end_datum);
  const sumNetto = summeKonditionNetto(konditionZeilen, true);
  const verlaufLines = [
    {
      text: `Beauftragt${gewerk ? ` · ${gewerk}` : ""}`,
      meta: "CRM",
    },
  ];

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
              style={{ color: PORTAL_C.primary }}
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

  const verlaufCard = (
    <PortalDetailCard title={HW_AUFTRAG_COPY.verlaufTitle}>
      <div className="flex flex-col gap-2.5">
        {verlaufLines.map((e, i) => (
          <div key={i} className="flex gap-2.5">
            <div
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: i === 0 ? PORTAL_C.primary : "#cfd4da",
              }}
            />
            <div>
              <p className="text-[12.5px] font-medium" style={{ color: PORTAL_C.ink }}>
                {e.text}
              </p>
              <p className="text-[11px]" style={{ color: PORTAL_C.faint }}>
                {e.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    </PortalDetailCard>
  );

  return (
    <PartnerDetailLayout>
      <div className="min-w-0 space-y-3.5">
        {/* Header */}
        <div
          className="rounded-xl bg-white px-4 py-4"
          style={{ border: `1px solid ${PORTAL_C.line}` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[12px] font-semibold"
                style={{ color: PORTAL_C.faint }}
              >
                {idLabel}
              </p>
              <h1
                className="mt-1 text-[22px] font-bold leading-snug"
                style={{
                  color: PORTAL_C.ink,
                  fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
                }}
              >
                {titel}
              </h1>
              {headerSub ? (
                <p className="mt-1 text-[13px]" style={{ color: PORTAL_C.sub }}>
                  {headerSub}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold"
                style={statusStyle}
                data-status-pill={statusPillKey}
              >
                {statusLabel}
              </span>
              {kannAbschluss ? (
                <button
                  type="button"
                  onClick={() => setAbschlussOpen(true)}
                  className="rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-white"
                  style={{ background: PORTAL_C.primary }}
                >
                  {HW_AUFTRAG_COPY.ausfuehrenCta}
                </button>
              ) : null}
            </div>
          </div>

          {/* Timeline */}
          <div
            className="mt-4 flex gap-0 overflow-x-auto pb-1"
            style={{ borderTop: `1px solid ${PORTAL_C.line2}` }}
          >
            {HW_AUFTRAG_TIMELINE.map((step, i) => {
              const done = i < timelineIdx;
              const act = i === timelineIdx;
              return (
                <div
                  key={step.id}
                  className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-1.5 pt-3"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      background: done || act ? PORTAL_C.primary : "#e8ebe9",
                      color: done || act ? "#fff" : PORTAL_C.faint,
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className="text-center text-[10.5px] font-semibold leading-tight"
                    style={{ color: act ? PORTAL_C.ink : PORTAL_C.faint }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Einsatz zuerst */}
        <div className="space-y-3.5 sm:hidden">
          {einsatzCard}
          {verlaufCard}
        </div>

        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            {beschreibung ? (
              <PortalDetailCard title={HW_AUFTRAG_COPY.beschreibungTitle}>
                <p className="text-[13px] leading-relaxed" style={{ color: PORTAL_C.sub }}>
                  {beschreibung}
                </p>
              </PortalDetailCard>
            ) : null}

            <PartnerAuftragErledigtSection
              positionen={item.positionen}
              layout="cta"
              done={abschlussDone}
              vollstaendig={abschlussVollstaendig}
            />

            {item.positionen.length > 0 ? (
              <PartnerPositionLebenszyklusList
                auftragId={item.id}
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
            ) : null}

            {konditionZeilen.length > 0 ? (
              <PortalDetailCard title={HW_AUFTRAG_COPY.leistungenTitle}>
                <PartnerLeistungenKonditionenCard
                  zeilen={konditionZeilen}
                  mode="readonly"
                  variant="plain"
                  gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
                />
              </PortalDetailCard>
            ) : null}

            {isAuftragAbgeschlossen(item.status) ? (
              <PortalDetailCard title="Deine Bewertung">
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
                      Ø{" "}
                      {formatHandwerkerBewertung(
                        durchschnittAusBewertung(item.bewertung)
                      )}
                    </p>
                    {item.bewertung.updated_at ? (
                      <p className="portal-text-meta text-text-secondary">
                        Bewertet am {fmtPartnerDate(item.bewertung.updated_at)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
                    Noch keine Bewertung für diesen Auftrag.
                  </p>
                )}
              </PortalDetailCard>
            ) : null}

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

            <PortalDetailCard title={HW_AUFTRAG_COPY.bautagebuchTitle}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12.5px]" style={{ color: PORTAL_C.faint }}>
                  Einträge werden geprüft, bevor sie für Kunden sichtbar werden.
                </p>
                {!showNew && !editingEintrag ? (
                  <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
                    style={{
                      borderColor: PORTAL_C.line,
                      color: PORTAL_C.sub,
                      background: "#fff",
                    }}
                  >
                    + Eintrag
                  </button>
                ) : null}
              </div>
              {item.bautagebuchAnfrageOffen ? (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                  Bitte Tagebucheintrag erstellen.
                  {item.bautagebuchAnfrageNotiz?.trim() ? (
                    <span className="mt-1 block font-normal text-amber-800">
                      {item.bautagebuchAnfrageNotiz.trim()}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {showNew ? (
                <BautagebuchForm
                  auftragId={item.id}
                  onDone={() => setShowNew(false)}
                />
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
            </PortalDetailCard>

            <PortalDetailCard title={HW_AUFTRAG_COPY.unterlagenTitle}>
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
                      className="space-y-2 rounded-xl border border-dashed p-4"
                      style={{ borderColor: PORTAL_C.line }}
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
                          const err = validatePartnerAngebotFiles(list, {
                            required: false,
                          });
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

                  {kannRechnungHochladen && item.angebotHandwerkerId ? (
                    <div
                      className="space-y-2 rounded-xl border p-4"
                      style={{ borderColor: PORTAL_C.line }}
                    >
                      <p className="portal-text-body font-semibold text-text-primary">
                        Rechnung erstellen
                      </p>
                      <p className="text-[12.5px] text-text-secondary">
                        Automatisch aus Firmendaten und bestätigten Konditionen —
                        oder optional eigenes PDF hochladen.
                      </p>
                      <button
                        type="button"
                        onClick={() => setRechnungDocOpen(true)}
                        className="btn-pill portal-btn !px-4 !py-2.5"
                      >
                        Rechnung prüfen &amp; einreichen
                      </button>
                    </div>
                  ) : null}

                  {kannRechnungHochladen ? (
                    <form
                      onSubmit={onRechnungSubmit}
                      className="space-y-2 rounded-xl border border-dashed p-4"
                      style={{ borderColor: PORTAL_C.line }}
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
                        className="btn-pill-outline portal-btn !px-4 !py-2.5"
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
            </PortalDetailCard>

            {bauauftragUnterlagen.length > 0 ? (
              <PartnerComplianceCheckliste
                title="Nachweise laut Projektvertrag (Anlage 1)"
                items={bauauftragUnterlagen}
                auftragId={item.id}
                gruppiert
              />
            ) : null}
          </div>

          {/* Desktop sidebar */}
          <div className="hidden w-full shrink-0 flex-col gap-3.5 sm:flex sm:w-[260px]">
            {einsatzCard}
            {verlaufCard}
          </div>
        </div>
      </div>

      <PartnerAbschlussModal
        open={abschlussOpen}
        auftragId={item.id}
        leistungen={offeneAbschlussLeistungen}
        defaultOrt={[item.plz, item.ort]
          .filter((v) => v && v !== "—")
          .join(" ")}
        onClose={() => setAbschlussOpen(false)}
        onSuccess={(voll) => {
          setAbschlussVollstaendig(voll);
          setAbschlussDone(true);
          setAbschlussOpen(false);
          if (item.angebotHandwerkerId && !item.hw_rechnung_eingereicht_at) {
            setRechnungDocOpen(true);
          }
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
          onClose={() => setRechnungDocOpen(false)}
          onSuccess={() => setRechnungDocOpen(false)}
          allowSkip
        />
      ) : null}
    </PartnerDetailLayout>
  );
}
