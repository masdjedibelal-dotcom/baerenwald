"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { PartnerDetailSection } from "@/components/partner/PartnerDetailUi";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import {
  PortalDokumentActions,
  PortalDokumentMetaLine,
  PortalDokumentUploadZone,
} from "@/components/shared/PortalDokumentUi";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import {
  stammDokumentStatusLabel,
  stammDokumentStatusPillClass,
  EIGENES_STAMM_DOKUMENT_TYP,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
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

function rahmenStatusPillClass(akzeptiert: boolean): string {
  return akzeptiert ? "bg-emerald-100 text-emerald-700" : "bg-muted text-text-secondary";
}

type UploadDraft = {
  typ: string;
  titel: string;
  beschreibung: string;
  file: File | null;
};

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
          <PortalDokumentMetaLine
            datum={datum !== "—" ? datum : null}
            status={
              <StatusPill label={statusLabel} className={statusClass} />
            }
          />
        }
        error={error}
        actions={
          <PortalDokumentActions
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
    : akzeptiert
      ? "Akzeptiert"
      : undefined;

  return (
    <PortalDokumentCard
      title="Partnerschafts-Rahmenvertrag"
      description={description}
      meta={
        <PortalDokumentMetaLine
          datum={datum !== "—" ? datum : null}
          status={
            akzeptiert ? (
              <StatusPill
                label="Erledigt"
                className={rahmenStatusPillClass(true)}
              />
            ) : null
          }
        />
      }
      actions={
        <PortalDokumentActions
          href={pdfUrl}
          name="Partnerschafts-Rahmenvertrag"
        />
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
  const { uploadBusy: saving, runUpload } = usePortalUploadBusy();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState<UploadDraft>({
    typ: EIGENES_STAMM_DOKUMENT_TYP,
    titel: "",
    beschreibung: "",
    file: null,
  });
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
    setFormError(null);
    const fd = new FormData();
    fd.set("typ", draft.typ || EIGENES_STAMM_DOKUMENT_TYP);
    fd.set("bezeichnung", titel);
    if (draft.beschreibung.trim()) {
      fd.set("beschreibung", draft.beschreibung.trim());
    }
    fd.set("file", draft.file);
    await runUpload(async () => {
      const res = await uploadPartnerComplianceDokument(fd);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      partnerPortalToast.complianceHochgeladen(titel);
      setUploadOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* Kein Section-Titel — Tab heißt schon „Stammunterlagen“. */}
      <PartnerDetailSection>
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

        <PortalDokumentUploadZone
          className="mt-3"
          variant="stack"
          label="Dokument hochladen"
          hint="PDF, JPG, PNG oder WebP"
          onClick={openNewUpload}
        />

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
        busyTitle="Wird hochgeladen…"
        busyBody="Dokument wird gespeichert."
        onConfirm={() => void submitUpload()}
        confirmDisabled={saving}
        confirmLabel="Hochladen"
      >
        <label className="block space-y-1">
          <span className="portal-text-label normal-case text-text-tertiary">
            Titel
          </span>
          <input
            className="portal-field w-full"
            value={draft.titel}
            onChange={(e) =>
              setDraft((d) => ({ ...d, titel: e.target.value }))
            }
            placeholder="z. B. Gewerbeanmeldung"
            disabled={saving}
          />
        </label>
        <label className="block space-y-1">
          <span className="portal-text-label normal-case text-text-tertiary">
            Beschreibung (optional)
          </span>
          <textarea
            className="portal-field w-full min-h-[72px] resize-y"
            value={draft.beschreibung}
            onChange={(e) =>
              setDraft((d) => ({ ...d, beschreibung: e.target.value }))
            }
            disabled={saving}
          />
        </label>
        <FileUploadField
          label="Datei"
          hint="PDF oder Foto"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          size="compact"
          disabled={saving}
          selectedFile={draft.file}
          selectedName={draft.file?.name ?? null}
          onChange={(files) =>
            setDraft((d) => ({ ...d, file: files[0] ?? null }))
          }
        />
        {formError ? (
          <p className="portal-text-meta text-red-700" role="alert">
            {formError}
          </p>
        ) : null}
      </PortalModalShell>
    </>
  );
}
