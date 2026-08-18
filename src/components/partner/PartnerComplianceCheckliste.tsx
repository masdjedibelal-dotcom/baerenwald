"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, Trash2, Upload } from "lucide-react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalEmptyState } from "@/components/shared/PortalEmptyState";
import { PortalStatusPill } from "@/components/shared/PortalStatusPill";
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("typ", item.slug);
    fd.set("bezeichnung", item.bezeichnung);
    if (auftragId) fd.set("auftragId", uploadAuftragIdForItem(item, auftragId) ?? "");
    if (item.erneuerung_monate) fd.set("erneuerungMonate", String(item.erneuerung_monate));
    fd.set("file", file);
    const res = await uploadPartnerComplianceDokument(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.complianceHochgeladen(item.bezeichnung);
    router.refresh();
  }

  async function onDelete() {
    if (!item.dokument?.id) return;
    setLoading(true);
    setError(null);
    const res = await deletePartnerComplianceDokument({
      dokumentId: item.dokument.id,
      auftragId: uploadAuftragIdForItem(item, auftragId),
    });
    setLoading(false);
    setConfirmDelete(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.complianceGeloescht(item.bezeichnung);
    router.refresh();
  }

  const actions = (
    <div className="flex shrink-0 items-center gap-0.5">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-touch-target inline-grid place-items-center rounded-lg text-accent hover:bg-accent-light/30"
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
            className="portal-touch-target inline-grid place-items-center rounded-lg text-accent hover:bg-accent-light/30 disabled:opacity-50"
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
          className="portal-touch-target inline-grid place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
          aria-label={`${item.bezeichnung} löschen`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const pill = (
    <PortalStatusPill
      label={complianceStatusLabel(item.status)}
      tone={statusTone(item.status)}
    />
  );

  return (
    <>
      {/* Mobil: Card */}
      <li className="sm:hidden">
        <article className="rounded-xl border border-border-light bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-snug text-text-primary">
                {item.bezeichnung}
              </p>
              {ablehnung ? (
                <p className="portal-text-meta mt-1 text-red-700 line-clamp-2">
                  {ablehnung}
                </p>
              ) : null}
            </div>
            {pill}
          </div>
          <div className="mt-3 flex items-center justify-end border-t border-border-light pt-3">
            {actions}
          </div>
          {error ? (
            <p className="portal-text-meta mt-2 text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </article>
      </li>

      {/* Desktop: Zeile */}
      <li className="hidden border-b border-border-light last:border-b-0 sm:list-item">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="portal-text-body font-medium text-text-primary line-clamp-2">
              {item.bezeichnung}
            </p>
            {ablehnung ? (
              <p className="portal-text-meta mt-0.5 text-red-700 line-clamp-2">
                {ablehnung}
              </p>
            ) : null}
          </div>
          {pill}
          {actions}
        </div>
        {error ? (
          <p className="portal-text-meta px-3 pb-2 text-red-700" role="alert">
            {error}
          </p>
        ) : null}
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
      <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-border-light">
        {gruppeComplianceItems(items).map((gruppe) => (
          <div key={gruppe.kategorie}>
            <p className="portal-text-meta px-1 py-1.5 font-semibold uppercase tracking-wide text-text-tertiary sm:bg-muted/30 sm:px-3 sm:py-2">
              {gruppe.kategorie}
            </p>
            <ul className="space-y-2.5 sm:space-y-0">
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
    <ul className="space-y-2.5 sm:space-y-0">
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
        <PortalEmptyState title={emptyText} compact />
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
