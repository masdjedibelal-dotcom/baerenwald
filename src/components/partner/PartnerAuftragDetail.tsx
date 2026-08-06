"use client";

import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";

import { submitPartnerAngebotPdf, submitPartnerRechnung } from "@/app/actions/partner-angebote";
import { createPartnerBautagebuchEintrag,
  deletePartnerBautagebuchEintrag,
  updatePartnerBautagebuchEintrag,
} from "@/app/actions/partner-bautagebuch";
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
  partnerNeedsAutoAngebotPrompt,
  partnerNeedsAutoRechnungPrompt,
} from "@/lib/partner/partner-auftrag-dokumente";
import { HW_ABNAHME_COPY } from "@/lib/partner/hw-abnahme";
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
import { HW_DOKU_STORY } from "@/lib/portal2/hw-doku-story";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

function BautagebuchForm({
  auftragId,
  auftragTitel,
  anfrageId,
  eintrag,
  onDone,
}: {
  auftragId: string;
  auftragTitel?: string | null;
  anfrageId?: string | null;
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const native = new FormData(e.currentTarget);
    const fd = new FormData();
    fd.set("auftragId", auftragId);
    if (anfrageId) fd.set("anfrageId", anfrageId);
    if (eintrag) {
      fd.set("eintragId", eintrag.id);
      fd.set("keepFotoPaths", eintrag.foto_urls.join(","));
    }
    fd.set("titel", titel);
    fd.set("beschreibung", beschreibung);
    const roh = String(native.get("beschreibung_roh") ?? "").trim();
    if (roh) fd.set("beschreibung_roh", roh);
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
        {eintrag ? "Eintrag bearbeiten" : "Neue Zusatznotiz"}
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
      <PartnerKiKorrekturField
        scope="bautagebuch"
        label="Beschreibung"
        value={beschreibung}
        onChange={setBeschreibung}
        rows={3}
        auftragTitel={auftragTitel}
        placeholder="Was wurde gemacht? Optional: einsprechen, dann KI korrigieren."
      />
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
          className={cn("btn-pill-primary portal-btn", loading && "opacity-60")}
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
  const dokuSectionRef = useRef<HTMLDivElement>(null);
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
  const [angebotDocOpen, setAngebotDocOpen] = useState(false);
  const [autoOpenPreferred, setAutoOpenPreferred] = useState(false);
  const autoDocDismissedRef = useRef<{ angebot?: boolean; rechnung?: boolean }>(
    {}
  );
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
    const hasPreferred = preferredPositionIds.length > 0;
    if (!hasPreferred) setShowNew(true);
    else setAutoOpenPreferred(true);
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
      return;
    }
    if (
      partnerNeedsAutoAngebotPrompt(item) &&
      !autoDocDismissedRef.current.angebot
    ) {
      setAngebotDocOpen(true);
    }
  }, [
    item.id,
    item.hw_angebot_pdf_url,
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
    hwAbschlussSigniertAm: item.hw_abschluss_signiert_am,
    abnahmeProtokollUrl: item.abnahme_protokoll_url,
    abnahmeFreigabeStatus: item.abnahme_freigabe_status,
  });

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
  const { label: listenStatusLabel } =
    resolvePartnerVorgangListenStatus(vorgangState, item);

  const titel = resolvePartnerDetailTitelFromAuftrag(item);
  const statusLabel = hwAuftragStatusLabel({
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
  const headerSub = [objektLine, gewerk].filter(Boolean).join(" · ");
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
      <p className="text-center text-[12px]" style={{ color: PORTAL_VAR.sub }}>
        {HW_AUFTRAG_COPY.ausfuehrenHint}
      </p>
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
        metaLine={headerSub || undefined}
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
              <div ref={dokuSectionRef}>
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
              </div>

              <PartnerFachdokuSlots auftragId={item.id} className="mt-4" />

              {konditionZeilen.length > 0 ? (
                <PartnerLeistungenKonditionenCard
                  zeilen={konditionZeilen}
                  mode="readonly"
                  variant="totalsOnly"
                  gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
                />
              ) : null}

              <div className="mt-5 border-t border-border-light pt-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="portal-text-label text-text-tertiary">
                      {HW_DOKU_STORY.freiesBtTitle}
                    </h4>
                    <p
                      className="mt-1 text-[12.5px]"
                      style={{ color: PORTAL_VAR.faint }}
                    >
                      {HW_DOKU_STORY.freiesBtBody}
                    </p>
                  </div>
                  {!showNew && !editingEintrag ? (
                    <button
                      type="button"
                      onClick={() => setShowNew(true)}
                      className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
                      style={{
                        borderColor: PORTAL_VAR.line,
                        color: PORTAL_VAR.sub,
                        background: "#fff",
                      }}
                    >
                      + Eintrag
                    </button>
                  ) : null}
                </div>
                {item.bautagebuchAnfrageOffen ? (
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    {preferredPositionIds.length > 0
                      ? "Bitte diese Leistungen dokumentieren"
                      : "Bitte Update geben — Zusatznotiz."}
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
                    auftragTitel={titel}
                    anfrageId={btAnfrageId}
                    onDone={() => setShowNew(false)}
                  />
                ) : null}
                {editingEintrag ? (
                  <BautagebuchForm
                    auftragId={item.id}
                    auftragTitel={titel}
                    eintrag={editingEintrag}
                    onDone={() => setEditId(null)}
                  />
                ) : null}
                <BautagebuchAccordionList
                  eintraege={accordionEintraege}
                  className="!border-t-0 !pt-0"
                  emptyText="Noch keine Zusatznotizen."
                />
              </div>
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
                emptyText="Noch keine Dokumente."
              />

              {zeigtDokumenteUpload ? (
                <div className="mt-4 space-y-4">
                  {kannUnterlagenHochladen ? (
                    <form
                      onSubmit={onPdfSubmit}
                      className="space-y-2 rounded-xl border border-dashed p-4"
                      style={{ borderColor: PORTAL_VAR.line }}
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
                          className="btn-pill-outline portal-btn"
                        >
                          {pdfLoading ? "Wird hochgeladen…" : "Hochladen"}
                        </button>
                      ) : null}
                    </form>
                  ) : null}

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
                initialFreigabeStatus={item.abnahme_freigabe_status}
                focus={focusAbnahme}
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
          if (result.pdf_url) setAbnahmePdfUrl(result.pdf_url);
          if (result.protokoll_id) setAbnahmeProtokollId(result.protokoll_id);
          if (item.angebotHandwerkerId && !item.hw_rechnung_eingereicht_at) {
            setRechnungDocOpen(true);
          }
        }}
      />

      {item.angebotHandwerkerId ? (
        <PartnerDokumentPreviewModal
          open={angebotDocOpen}
          anfrageId={item.angebotHandwerkerId}
          art="angebot"
          onClose={() => {
            autoDocDismissedRef.current.angebot = true;
            setAngebotDocOpen(false);
          }}
          onSuccess={() => setAngebotDocOpen(false)}
          allowSkip
        />
      ) : null}

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
