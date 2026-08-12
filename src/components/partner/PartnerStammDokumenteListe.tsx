"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { PartnerDetailSection } from "@/components/partner/PartnerDetailUi";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import { PortalDocOpenButton } from "@/components/shared/PortalDocOpenButton";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  stammDokumentStatusLabel,
  stammDokumentStatusPillClass,
  EIGENES_STAMM_DOKUMENT_TYP,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function rahmenStatusPillClass(akzeptiert: boolean): string {
  return akzeptiert ? "bg-emerald-100 text-emerald-700" : "bg-muted text-text-secondary";
}

type UploadDraft = {
  typ: string;
  titel: string;
  beschreibung: string;
  file: File | null;
};

function DokumentAktionen({
  href,
  name,
  kannHochladen,
  kannLoeschen,
  loading,
  onUploadClick,
  onDelete,
  className,
}: {
  href?: string;
  name: string;
  kannHochladen?: boolean;
  kannLoeschen?: boolean;
  loading?: boolean;
  onUploadClick?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {href ? (
        <>
          <PortalDocOpenButton
            href={normalizeHref(href)}
            name={name}
            kind="pdf"
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-[#c62828] transition-colors hover:bg-red-50"
          >
            <PdfFileIcon className="h-5 w-5" />
            <span className="sr-only">{`${name} ansehen`}</span>
          </PortalDocOpenButton>
          <PortalDocOpenButton
            href={normalizeHref(href)}
            name={name}
            kind="pdf"
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-text-secondary transition-colors hover:bg-muted/40"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">{`${name} herunterladen`}</span>
          </PortalDocOpenButton>
        </>
      ) : null}
      {kannHochladen ? (
        <button
          type="button"
          disabled={loading}
          onClick={onUploadClick}
          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-accent transition-colors hover:bg-accent-light/30 disabled:opacity-50"
          aria-label={`${name} hochladen`}
        >
          <Upload className="h-4 w-4" />
        </button>
      ) : null}
      {kannLoeschen ? (
        <button
          type="button"
          disabled={loading}
          onClick={onDelete}
          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          aria-label={`${name} löschen`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
      {!href && !kannHochladen && !kannLoeschen ? (
        <span className="portal-text-meta px-1 text-text-tertiary">—</span>
      ) : null}
    </div>
  );
}

function StatusPill({
  label,
  className,
}: {
  label: string | null;
  className: string;
}) {
  if (!label) return null;
  return (
    <span className={cn("tag inline-flex text-[11px]", className)}>{label}</span>
  );
}

function ComplianceDokumentItem({
  item,
  onUploadClick,
}: {
  item: PartnerComplianceItem;
  onUploadClick: (item: PartnerComplianceItem) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const href = item.dokument?.signed_url?.trim();
  const kannHochladen =
    item.status === "offen" ||
    item.status === "abgelehnt" ||
    item.status === "abgelaufen" ||
    item.status === "ablauf_warnung";
  const kannLoeschen =
    Boolean(item.dokument?.id) &&
    item.status !== "erledigt" &&
    item.status !== "in_pruefung";
  const datum = fmtDatum(
    item.dokument?.hochgeladen_am ?? item.dokument?.freigegeben_am
  );
  const statusLabel = stammDokumentStatusLabel(item.status);
  const statusClass = stammDokumentStatusPillClass(item.status);
  const description =
    item.status === "abgelehnt" && item.dokument?.ablehnung_grund
      ? item.dokument.ablehnung_grund
      : item.beschreibung?.trim() || null;

  async function onDelete() {
    if (!item.dokument?.id) return;
    setLoading(true);
    setError(null);
    const res = await deletePartnerComplianceDokument({
      dokumentId: item.dokument.id,
    });
    setLoading(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.complianceGeloescht(item.bezeichnung);
    router.refresh();
  }

  return (
    <>
      <PortalDokumentCard
        title={item.bezeichnung}
        description={description}
        meta={
          <>
            <span className="portal-text-meta tabular-nums text-text-tertiary">
              {datum !== "—" ? `Datum · ${datum}` : "Kein Datum"}
            </span>
            <StatusPill label={statusLabel} className={statusClass} />
          </>
        }
        error={error}
        actions={
          <DokumentAktionen
            href={href}
            name={item.bezeichnung}
            kannHochladen={kannHochladen}
            kannLoeschen={kannLoeschen}
            loading={loading}
            onUploadClick={() => onUploadClick(item)}
            onDelete={() => setConfirmOpen(true)}
          />
        }
      />
      <PortalConfirmDialog
        open={confirmOpen}
        title="Dokument entfernen?"
        description={`„${item.bezeichnung}“ wirklich entfernen?`}
        confirmLabel="Entfernen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function RahmenvertragDokumentItem({
  rahmenvertrag,
  akzeptiert,
  pdfUrl,
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  akzeptiert: boolean;
  pdfUrl?: string | null;
}) {
  const datum = fmtDatum(
    rahmenvertrag?.portal_akzeptiert_am ?? rahmenvertrag?.signiert_am ?? null
  );
  const description = rahmenvertrag?.vertrags_nr
    ? `Nr. ${rahmenvertrag.vertrags_nr}`
    : "Bei Registrierung akzeptiert — PDF folgt von Bärenwald";

  return (
    <PortalDokumentCard
      title="Partnerschafts-Rahmenvertrag"
      description={description}
      meta={
        <>
          <span className="portal-text-meta tabular-nums text-text-tertiary">
            {datum !== "—" ? `Datum · ${datum}` : "Kein Datum"}
          </span>
          {akzeptiert ? (
            <StatusPill label="Erledigt" className={rahmenStatusPillClass(true)} />
          ) : null}
        </>
      }
      actions={
        pdfUrl ? (
          <DokumentAktionen href={pdfUrl} name="Partnerschafts-Rahmenvertrag" />
        ) : (
          <span className="portal-text-meta text-text-tertiary">—</span>
        )
      }
    />
  );
}

export function PartnerStammDokumenteListe({
  rahmenvertrag,
  akzeptiert,
  pdfUrl,
  handwerkskarte = [],
  footer,
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  akzeptiert: boolean;
  pdfUrl?: string | null;
  handwerkskarte?: PartnerComplianceItem[];
  footer?: ReactNode;
}) {
  const router = useRouter();
  const hatHandwerkskarte = handwerkskarte.length > 0;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState<UploadDraft>({
    typ: EIGENES_STAMM_DOKUMENT_TYP,
    titel: "",
    beschreibung: "",
    file: null,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openNewUpload() {
    setDraft({
      typ: EIGENES_STAMM_DOKUMENT_TYP,
      titel: "",
      beschreibung: "",
      file: null,
    });
    setFormError(null);
    setUploadOpen(true);
  }

  function openItemUpload(item: PartnerComplianceItem) {
    setDraft({
      typ: item.slug || EIGENES_STAMM_DOKUMENT_TYP,
      titel: item.bezeichnung,
      beschreibung: item.beschreibung?.trim() || "",
      file: null,
    });
    setFormError(null);
    setUploadOpen(true);
  }

  function closeUpload() {
    if (saving) return;
    setUploadOpen(false);
    setFormError(null);
  }

  async function submitUpload() {
    const titel = draft.titel.trim();
    if (titel.length < 2) {
      setFormError("Bitte einen Titel angeben.");
      return;
    }
    if (!draft.file) {
      setFormError("Bitte Dokument oder Foto wählen.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const fd = new FormData();
    fd.set("typ", draft.typ || EIGENES_STAMM_DOKUMENT_TYP);
    fd.set("bezeichnung", titel);
    if (draft.beschreibung.trim()) {
      fd.set("beschreibung", draft.beschreibung.trim());
    }
    fd.set("file", draft.file);
    const res = await uploadPartnerComplianceDokument(fd);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    partnerPortalToast.complianceHochgeladen(titel);
    setUploadOpen(false);
    router.refresh();
  }

  return (
    <>
      <PartnerDetailSection title="Stammunterlagen">
        <p className="portal-text-meta mb-3 text-text-secondary">
          Rahmenvertrag und Nachweise — Datum, Status und Upload.
        </p>

        <div className="space-y-2.5">
          <RahmenvertragDokumentItem
            rahmenvertrag={rahmenvertrag}
            akzeptiert={akzeptiert}
            pdfUrl={pdfUrl}
          />
          {handwerkskarte.map((item) => (
            <ComplianceDokumentItem
              key={`${item.ebene}-${item.slug}-${item.dokument?.id ?? "open"}`}
              item={item}
              onUploadClick={openItemUpload}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={openNewUpload}
          className="mt-4 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-default bg-[var(--p2-selected,#f0f2f0)] px-4 py-7 text-center transition-colors hover:bg-[var(--p2-hover,#eef1ef)]"
          aria-label="Dokument hochladen"
        >
          <Upload className="h-6 w-6 text-text-secondary" aria-hidden />
          <span className="text-[13.5px] font-semibold text-text-primary">
            Dokument hochladen
          </span>
          <span className="portal-text-meta text-text-tertiary">
            Tippen oder Datei hier ablegen — PDF, JPG, PNG oder WebP
          </span>
        </button>

        {!hatHandwerkskarte ? (
          <p className="portal-text-meta mt-3 text-text-tertiary">
            Handwerkskarte erscheint hier, sobald sie bei Bärenwald hinterlegt ist.
            Eigene Nachweise kannst du jederzeit über den Upload-Kasten ergänzen.
          </p>
        ) : null}

        {akzeptiert && !pdfUrl ? (
          <p className="portal-text-meta mt-3 text-emerald-800">
            Rahmenvertrag bei Registrierung akzeptiert — personalisiertes PDF stellt
            Bärenwald bereit.
            {rahmenvertrag?.portal_akzeptiert_am ? (
              <>
                {" "}
                (Akzeptiert am {fmtPartnerDate(rahmenvertrag.portal_akzeptiert_am)})
              </>
            ) : null}
          </p>
        ) : null}

        {footer ? (
          <div className="mt-4 border-t border-border-light pt-4">{footer}</div>
        ) : null}
      </PartnerDetailSection>

      <PortalModalShell
        open={uploadOpen}
        title="Dokument hochladen"
        subtitle="Titel und optional Beschreibung — dann PDF oder Foto wählen."
        onClose={closeUpload}
        variant="edit"
        dirty
        closeOnBackdrop={!saving}
        busy={saving}
        onConfirm={() => void submitUpload()}
        confirmDisabled={saving}
        confirmLabel="Hochladen"
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
              Titel
            </span>
            <input
              type="text"
              className="w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-accent"
              value={draft.titel}
              onChange={(e) => setDraft({ ...draft, titel: e.target.value })}
              placeholder="z. B. Handwerkskarte, Freistellung…"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
              Beschreibung (optional)
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-accent"
              value={draft.beschreibung}
              onChange={(e) =>
                setDraft({ ...draft, beschreibung: e.target.value })
              }
              placeholder="Kurzbeschreibung für Bärenwald / Prüfung"
            />
          </label>
          <FileUploadField
            label="Dokument oder Foto"
            accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
            hint="PDF, JPG, PNG oder WebP"
            selectedName={draft.file?.name ?? null}
            onChange={(files) =>
              setDraft({ ...draft, file: files[0] ?? null })
            }
          />
          {formError ? (
            <p className="portal-text-meta text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn-pill-outline portal-btn"
              disabled={saving}
              onClick={closeUpload}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn-pill-primary portal-btn"
              disabled={saving}
              onClick={() => void submitUpload()}
            >
              {saving ? "Wird hochgeladen…" : "Hochladen"}
            </button>
          </div>
        </div>
      </PortalModalShell>
    </>
  );
}
