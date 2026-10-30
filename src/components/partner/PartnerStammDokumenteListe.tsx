"use client";
import { optimizeImageForUpload } from "@/lib/media/optimize-image-for-upload";
import { safeAction } from "@/lib/actions/safe-action";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalDate,PortalInput,PortalSelect,PortalTextarea } from "@/components/shared/PortalFormControls";
import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import {
  PortalDokumentActions,
  PortalDokumentMetaLine
} from "@/components/shared/PortalDokumentUi";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PortalStatusPill } from "@/components/shared/PortalStatusPill";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import {
  stammDokumentStatusLabel,
  EIGENES_STAMM_DOKUMENT_TYP,
  type PartnerComplianceItem,
  type PartnerComplianceItemStatus,
} from "@/lib/partner/partner-compliance";
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PortalStatusTone } from "@/lib/shared/portal-status-pill";

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function stammDokumentTone(
  status: PartnerComplianceItemStatus
): PortalStatusTone {
  if (status === "erledigt" || status === "ablauf_warnung") return "fertig";
  if (status === "in_pruefung") return "warn";
  if (status === "abgelehnt" || status === "abgelaufen") return "danger";
  return "neutral";
}

type UploadDraft = {
  typ: string;
  titel: string;
  beschreibung: string;
  gueltigBis: string;
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
  const description =
    item.status === "abgelehnt" && item.dokument?.ablehnung_grund
      ? item.dokument.ablehnung_grund
      : item.beschreibung?.trim() || null;

  async function onDelete() {
    if (!item.dokument?.id) return;
    setLoading(true);
    setError(null);
    const res = await safeAction(deletePartnerComplianceDokument({
      dokumentId: item.dokument.id,
    }));
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
              statusLabel ? (
                <PortalStatusPill
                  label={statusLabel}
                  tone={stammDokumentTone(item.status)}
                />
              ) : null
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
        title="Dokument löschen?"
        description={`„${item.bezeichnung}“ wirklich löschen?`}
        confirmLabel="Löschen"
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
              <PortalStatusPill label="Erledigt" tone="fertig" />
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
  nachweise = [],
  footer,
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  akzeptiert: boolean;
  pdfUrl?: string | null;
  nachweise?: PartnerComplianceItem[];
  footer?: ReactNode;
}) {
  const router = useRouter();
  const { uploadBusy: saving, runUpload } = usePortalUploadBusy();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState<UploadDraft>({
    typ: EIGENES_STAMM_DOKUMENT_TYP,
    titel: "",
    beschreibung: "",
    gueltigBis: "",
    file: null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  function openItemUpload(item: PartnerComplianceItem) {
    setDraft({
      typ: item.slug || EIGENES_STAMM_DOKUMENT_TYP,
      titel: "",
      beschreibung: item.beschreibung?.trim() || "",
      gueltigBis: "",
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

  // Im Profil nur Handwerkskarte + Freistellungsbescheinigung
  const arten = Array.from(
    new Map(nachweise.filter((i) => i.slug).map((i) => [i.slug, { slug: i.slug, label: i.bezeichnung }])).values()
  );
  const artLabel = arten.find((a) => a.slug === draft.typ)?.label ?? "Dokument";

  async function submitUpload() {
    const titel = draft.titel.trim() || (draft.typ !== EIGENES_STAMM_DOKUMENT_TYP ? artLabel : "");
    if (titel.length < 2) {
      setFormError("Bitte Art wählen oder einen Titel angeben.");
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
    if (draft.gueltigBis) fd.set("gueltigBis", draft.gueltigBis);
    // Fotos verkleinern — Uploads laufen über den Server (Netlify: ~4,5 MB je Anfrage)
    let datei = draft.file;
    if (datei.type.startsWith("image/")) {
      try {
        datei = await optimizeImageForUpload(datei, { maxEdge: 2400 });
      } catch {
        /* Original behalten */
      }
    }
    if (datei.size > 4 * 1024 * 1024) {
      setFormError(`Die Datei ist zu groß (${(datei.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB) — höchstens 4 MB.`);
      return;
    }
    fd.set("file", datei);
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
      <PortalDetailCard>
        <div className="space-y-2.5">
          <RahmenvertragDokumentItem
            rahmenvertrag={rahmenvertrag}
            akzeptiert={akzeptiert}
            pdfUrl={pdfUrl}
          />
          {nachweise.map((item) => (
            <ComplianceDokumentItem
              key={`${item.ebene}-${item.slug}-${item.dokument?.id ?? "open"}`}
              item={item}
              onUploadClick={openItemUpload}
            />
          ))}
        </div>

        {/* Nur Handwerkskarte, Freistellung + Rahmenvertrag im Profil (04.10.2026) — Dokumente zum Auftrag am Einsatz */}

        {footer ? (
          <div className="mt-4 border-t border-border-light pt-4">{footer}</div>
        ) : null}
      </PortalDetailCard>

      <PortalModalShell
        open={uploadOpen}
        title="Dokument hochladen"
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
            Art
          </span>
          <PortalSelect
            className="portal-field w-full"
            value={draft.typ}
            onChange={(e) => setDraft((d) => ({ ...d, typ: e.target.value }))}
            disabled={saving}
          >
            {arten.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.label}
              </option>
            ))}
          </PortalSelect>
        </label>
        <label className="block space-y-1">
          <span className="portal-text-label normal-case text-text-tertiary">
            {draft.typ === EIGENES_STAMM_DOKUMENT_TYP ? "Titel" : "Titel (optional)"}
          </span>
          <PortalInput
            className="portal-field w-full"
            value={draft.titel}
            onChange={(e) =>
              setDraft((d) => ({ ...d, titel: e.target.value }))
            }
            placeholder={draft.typ === EIGENES_STAMM_DOKUMENT_TYP ? "z. B. Zertifikat" : artLabel}
            disabled={saving}
          />
        </label>
        <label className="block space-y-1">
          <span className="portal-text-label normal-case text-text-tertiary">
            Beschreibung (optional)
          </span>
          <PortalTextarea
            className="portal-field w-full min-h-[72px] resize-y"
            value={draft.beschreibung}
            onChange={(e) =>
              setDraft((d) => ({ ...d, beschreibung: e.target.value }))
            }
            disabled={saving}
          />
        </label>
        {draft.typ !== EIGENES_STAMM_DOKUMENT_TYP ? (
          <label className="block space-y-1">
            <span className="portal-text-label normal-case text-text-tertiary">
              Gültig bis (optional)
            </span>
            <PortalDate
              className="w-full"
              value={draft.gueltigBis}
              onChange={(e) => setDraft((d) => ({ ...d, gueltigBis: e.target.value }))}
              disabled={saving}
            />
          </label>
        ) : null}
        <FileUploadField
          label="Datei"
          hint="PDF oder Foto · max. 4 MB"
          maxBytes={4 * 1024 * 1024}
          bilderVerkleinern
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
          <p className="portal-text-meta text-p2-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </PortalModalShell>
    </>
  );
}
