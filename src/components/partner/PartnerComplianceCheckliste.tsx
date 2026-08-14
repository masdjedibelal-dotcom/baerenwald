"use client";

import { useRef, useState } from "react";
import { Eye, Trash2, Upload } from "lucide-react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalDokumentCard } from "@/components/shared/PortalDokumentCard";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalStatusPill } from "@/components/shared/PortalStatusPill";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { gruppeComplianceItems } from "@/lib/partner/compliance-summary";
import {
  complianceStatusLabel,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
import type { PortalStatusTone } from "@/lib/shared/portal-status-pill";
import { cn } from "@/lib/utils";

function statusTone(status: PartnerComplianceItem["status"]): PortalStatusTone {
  if (status === "erledigt") return "fertig";
  if (status === "in_pruefung" || status === "ablauf_warnung") return "warn";
  if (status === "abgelehnt" || status === "abgelaufen") return "danger";
  return "neutral";
}

function uploadAuftragIdForItem(
  item: PartnerComplianceItem,
  auftragId?: string | null
): string | null | undefined {
  return item.ebene === "leistung" ? auftragId : null;
}

function KompaktComplianceRow({
  item,
  auftragId,
  disabled,
}: {
  item: PartnerComplianceItem;
  auftragId?: string | null;
  disabled?: boolean;
}) {
  const { refresh } = usePortalRefresh();
  const { uploadBusy: loading, runUpload } = usePortalUploadBusy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kannHochladen =
    !disabled &&
    (item.status === "offen" ||
      item.status === "abgelehnt" ||
      item.status === "abgelaufen" ||
      item.status === "ablauf_warnung");
  const kannLoeschen =
    !disabled &&
    Boolean(item.dokument?.id) &&
    item.status !== "erledigt" &&
    item.status !== "in_pruefung";
  const href = item.dokument?.signed_url?.trim();
  const ablehnung =
    item.status === "abgelehnt" && item.dokument?.ablehnung_grund
      ? item.dokument.ablehnung_grund
      : null;

  async function onUpload(file: File) {
    setError(null);
    await runUpload(async () => {
      const fd = new FormData();
      fd.set("typ", item.slug);
      fd.set("bezeichnung", item.bezeichnung);
      if (auftragId) fd.set("auftragId", uploadAuftragIdForItem(item, auftragId) ?? "");
      if (item.erneuerung_monate) fd.set("erneuerungMonate", String(item.erneuerung_monate));
      fd.set("file", file);
      const res = await uploadPartnerComplianceDokument(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      partnerPortalToast.complianceHochgeladen(item.bezeichnung);
      await refresh();
    });
  }

  async function onDelete() {
    const dokumentId = item.dokument?.id;
    if (!dokumentId) return;
    setError(null);
    await runUpload(async () => {
      const res = await deletePartnerComplianceDokument({
        dokumentId,
        auftragId: uploadAuftragIdForItem(item, auftragId),
      });
      setConfirmDelete(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      partnerPortalToast.complianceGeloescht(item.bezeichnung);
      await refresh();
    });
  }

  const actions = (
    <>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-accent transition-colors hover:bg-accent-light/30"
          aria-label={`${item.bezeichnung} ansehen`}
        >
          <Eye className="h-4 w-4" />
        </a>
      ) : null}
      {kannHochladen ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-accent transition-colors hover:bg-accent-light/30 disabled:opacity-50"
            aria-label={`${item.bezeichnung} hochladen`}
          >
            <Upload className="h-4 w-4" />
          </button>
        </>
      ) : null}
      {kannLoeschen ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setConfirmDelete(true)}
          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          aria-label={`${item.bezeichnung} löschen`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <li>
        <PortalDokumentCard
          title={item.bezeichnung}
          description={ablehnung}
          meta={
            <PortalStatusPill
              label={complianceStatusLabel(item.status)}
              tone={statusTone(item.status)}
            />
          }
          error={error}
          actions={actions}
        />
      </li>

      <PortalConfirmDialog
        open={confirmDelete}
        title="Dokument entfernen?"
        description={`„${item.bezeichnung}“ wirklich entfernen?`}
        confirmLabel="Entfernen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function KompaktListe({
  items,
  auftragId,
  disabled,
  gruppiert,
}: {
  items: PartnerComplianceItem[];
  auftragId?: string | null;
  disabled?: boolean;
  gruppiert: boolean;
}) {
  if (gruppiert) {
    return (
      <div className="space-y-4">
        {gruppeComplianceItems(items).map((gruppe) => (
          <div key={gruppe.kategorie} className="space-y-2">
            <p className="portal-text-meta px-0.5 font-semibold uppercase tracking-wide text-text-tertiary">
              {gruppe.kategorie}
            </p>
            <ul className="space-y-2.5">
              {gruppe.items.map((item) => (
                <KompaktComplianceRow
                  key={`${item.ebene}-${item.slug}`}
                  item={item}
                  auftragId={auftragId}
                  disabled={disabled}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <KompaktComplianceRow
          key={`${item.ebene}-${item.slug}`}
          item={item}
          auftragId={auftragId}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}

export function PartnerComplianceCheckliste({
  title,
  items,
  auftragId,
  disabled,
  gruppiert = false,
  emptyText = "Keine Unterlagen erforderlich.",
}: {
  title: string;
  items: PartnerComplianceItem[];
  auftragId?: string | null;
  disabled?: boolean;
  gruppiert?: boolean;
  emptyText?: string;
}) {
  if (!items.length) {
    return (
      <section className="overflow-hidden rounded-xl border border-border-light bg-surface-card p-3">
        <PortalInboxEmpty title={emptyText} compact />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border-light bg-surface-card">
      <div className="border-b border-border-light px-4 py-3">
        <h4 className="portal-text-section text-text-primary">{title}</h4>
        <p className="portal-text-meta mt-0.5 text-text-secondary">
          {items.length} {items.length === 1 ? "Punkt" : "Punkte"} — hochladen,
          ansehen oder löschen
        </p>
      </div>
      <div className="p-3 sm:p-0">
        <KompaktListe
          items={items}
          auftragId={auftragId}
          disabled={disabled}
          gruppiert={gruppiert}
        />
      </div>
    </section>
  );
}
