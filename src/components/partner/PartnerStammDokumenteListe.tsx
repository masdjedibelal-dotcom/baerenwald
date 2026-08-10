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
          <a
            href={normalizeHref(href)}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-[#c62828] transition-colors hover:bg-red-50"
            aria-label={`${name} ansehen`}
          >
            <PdfFileIcon className="h-5 w-5" />
          </a>
          <a
            href={normalizeHref(href)}
            download
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-text-secondary transition-colors hover:bg-muted/40"
            aria-label={`${name} herunterladen`}
          >
            <Download className="h-4 w-4" />
          </a>
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

function DokumentCardShell({
  title,
  subtitle,
  datum,
  status,
  error,
  actions,
}: {
  title: string;
  subtitle?: string | null;
  datum: string;
  status?: ReactNode;
  error?: string | null;
  actions: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border-light bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-text-primary">
            {title}
          </p>
          {subtitle ? (
            <p className="portal-text-meta mt-1 text-text-secondary line-clamp-2">
              {subtitle}
            </p>
          ) : null}
        </div>
        {status}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-light pt-3">
        <p className="portal-text-meta tabular-nums text-text-tertiary">
          {datum !== "—" ? `Datum · ${datum}` : "Kein Datum"}
        </p>
        {actions}
      </div>
      {error ? (
        <p className="portal-text-meta mt-2 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}

function ComplianceDokumentItem({
  item,
  onUploadClick,
  variant,
}: {
  item: PartnerComplianceItem;
  onUploadClick: (item: PartnerComplianceItem) => void;
  variant: "card" | "row";
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
  const subtitle =
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

  const actions = (
    <DokumentAktionen
      href={href}
      name={item.bezeichnung}
      kannHochladen={kannHochladen}
      kannLoeschen={kannLoeschen}
      loading={loading}
      onUploadClick={() => onUploadClick(item)}
      onDelete={() => setConfirmOpen(true)}
      className={variant === "row" ? "justify-end" : "justify-end"}
    />
  );

  const confirmDialog = (
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
  );

  if (variant === "card") {
    return (
      <>
        <DokumentCardShell
          title={item.bezeichnung}
          subtitle={subtitle}
          datum={datum}
          status={<StatusPill label={statusLabel} className={statusClass} />}
          error={error}
          actions={actions}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <tr className="border-b border-border-light last:border-b-0">
        <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
          {datum}
        </td>
        <td className="min-w-0 px-3 py-3">
          <p className="font-medium text-text-primary line-clamp-2">
            {item.bezeichnung}
          </p>
          {subtitle ? (
            <p className="portal-text-meta mt-0.5 text-text-secondary line-clamp-2">
              {subtitle}
            </p>
          ) : null}
          {error ? (
            <p className="portal-text-meta mt-0.5 text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </td>
        <td className="px-3 py-3">
          {statusLabel ? (
            <StatusPill label={statusLabel} className={statusClass} />
          ) : (
            <span className="portal-text-meta text-text-tertiary">—</span>
          )}
        </td>
        <td className="w-[5.5rem] px-2 py-2 text-right">{actions}</td>
      </tr>
      {confirmDialog}
    </>
  );
}

function RahmenvertragDokumentItem({
  rahmenvertrag,
  akzeptiert,
  pdfUrl,
  variant,
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  akzeptiert: boolean;
  pdfUrl?: string | null;
  variant: "card" | "row";
}) {
  const datum = fmtDatum(
    rahmenvertrag?.portal_akzeptiert_am ?? rahmenvertrag?.signiert_am ?? null
  );
  const subtitle = rahmenvertrag?.vertrags_nr
    ? `Nr. ${rahmenvertrag.vertrags_nr}`
    : "Bei Registrierung akzeptiert — PDF folgt von Bärenwald";
  const actions = pdfUrl ? (
    <DokumentAktionen
      href={pdfUrl}
      name="Partnerschafts-Rahmenvertrag"
      className="justify-end"
    />
  ) : (
    <span className="portal-text-meta text-text-tertiary">—</span>
  );
  const status = akzeptiert ? (
    <StatusPill label="Erledigt" className={rahmenStatusPillClass(true)} />
  ) : null;

  if (variant === "card") {
    return (
      <DokumentCardShell
        title="Partnerschafts-Rahmenvertrag"
        subtitle={subtitle}
        datum={datum}
        status={status}
        actions={actions}
      />
    );
  }

  return (
    <tr className="border-b border-border-light last:border-b-0">
      <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
        {datum}
      </td>
      <td className="min-w-0 px-3 py-3">
        <p className="font-medium text-text-primary">
          Partnerschafts-Rahmenvertrag
        </p>
        <p className="portal-text-meta mt-0.5 text-text-secondary line-clamp-2">
          {subtitle}
        </p>
      </td>
      <td className="px-3 py-3">
        {status ?? <span className="portal-text-meta text-text-tertiary">—</span>}
      </td>
      <td className="w-[5.5rem] px-2 py-2 text-right">{actions}</td>
    </tr>
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
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="portal-text-meta text-text-secondary">
            Rahmenvertrag und Nachweise — Datum, Status und Upload.
          </p>
          <button
            type="button"
            onClick={openNewUpload}
            className="portal-touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border-default bg-white px-3 text-[12.5px] font-semibold text-accent transition-colors hover:border-accent/40 hover:bg-accent-light/20"
            aria-label="Dokument hochladen"
            title="Dokument hochladen"
          >
            <Upload className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Hochladen</span>
          </button>
        </div>

        {/* Mobil: Cards */}
        <div className="space-y-2.5 sm:hidden">
          <RahmenvertragDokumentItem
            rahmenvertrag={rahmenvertrag}
            akzeptiert={akzeptiert}
            pdfUrl={pdfUrl}
            variant="card"
          />
          {handwerkskarte.map((item) => (
            <ComplianceDokumentItem
              key={`${item.ebene}-${item.slug}-${item.dokument?.id ?? "open"}-card`}
              item={item}
              onUploadClick={openItemUpload}
              variant="card"
            />
          ))}
        </div>

        {/* Desktop: Tabelle */}
        <div className="hidden overflow-hidden rounded-xl border border-border-light sm:block">
          <table className="portal-text-body w-full">
            <thead>
              <tr className="portal-text-meta border-b border-border-light bg-muted/30 text-left text-text-tertiary">
                <th className="px-3 py-2.5 font-semibold">Datum</th>
                <th className="px-3 py-2.5 font-semibold">Dokument</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="w-[5.5rem] px-2 py-2.5 text-right font-semibold">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              <RahmenvertragDokumentItem
                rahmenvertrag={rahmenvertrag}
                akzeptiert={akzeptiert}
                pdfUrl={pdfUrl}
                variant="row"
              />
              {handwerkskarte.map((item) => (
                <ComplianceDokumentItem
                  key={`${item.ebene}-${item.slug}-${item.dokument?.id ?? "open"}-row`}
                  item={item}
                  onUploadClick={openItemUpload}
                  variant="row"
                />
              ))}
            </tbody>
          </table>
        </div>

        {!hatHandwerkskarte ? (
          <p className="portal-text-meta mt-3 text-text-tertiary">
            Handwerkskarte erscheint hier, sobald sie bei Bärenwald hinterlegt ist.
            Eigene Nachweise kannst du jederzeit über „Hochladen“ ergänzen.
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
