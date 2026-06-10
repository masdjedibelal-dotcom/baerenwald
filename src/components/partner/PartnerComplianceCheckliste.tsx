"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Upload, XCircle } from "lucide-react";

import { uploadPartnerComplianceDokument } from "@/app/actions/partner-compliance";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { gruppeComplianceItems } from "@/lib/partner/compliance-summary";
import {
  complianceStatusLabel,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import { cn } from "@/lib/utils";

function statusIcon(status: PartnerComplianceItem["status"]) {
  if (status === "erledigt") return CheckCircle2;
  if (status === "in_pruefung") return Clock;
  if (status === "abgelehnt") return XCircle;
  if (status === "ablauf_warnung" || status === "abgelaufen") return AlertTriangle;
  return Upload;
}

function statusClass(status: PartnerComplianceItem["status"]): string {
  if (status === "erledigt") return "text-emerald-700 bg-emerald-50";
  if (status === "in_pruefung") return "text-blue-800 bg-blue-50";
  if (status === "abgelehnt") return "text-red-700 bg-red-50";
  if (status === "abgelaufen") return "text-red-800 bg-red-50";
  if (status === "ablauf_warnung") return "text-amber-800 bg-amber-50";
  return "text-amber-800 bg-amber-50";
}

function ComplianceRow({
  item,
  auftragId,
  disabled,
}: {
  item: PartnerComplianceItem;
  auftragId?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);
  const Icon = statusIcon(item.status);
  const kannHochladen =
    !disabled &&
    (item.status === "offen" ||
      item.status === "abgelehnt" ||
      item.status === "abgelaufen" ||
      item.status === "ablauf_warnung");

  async function onUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadOk(false);
    const fd = new FormData();
    fd.set("typ", item.slug);
    fd.set("bezeichnung", item.bezeichnung);
    if (auftragId) fd.set("auftragId", auftragId);
    if (item.erneuerung_monate) fd.set("erneuerungMonate", String(item.erneuerung_monate));
    fd.set("file", file);
    const res = await uploadPartnerComplianceDokument(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUploadOk(true);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-border-light bg-surface-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="portal-text-body font-semibold text-text-primary">
            {item.bezeichnung}
            {item.pflicht ? (
              <span className="ml-1 text-red-600" aria-hidden>
                *
              </span>
            ) : null}
          </p>
          {item.beschreibung ? (
            <p className="portal-text-meta mt-0.5 text-text-secondary">{item.beschreibung}</p>
          ) : null}
          {item.dokument?.gueltig_bis ? (
            <p className="portal-text-meta mt-1 text-text-secondary">
              Gültig bis: {fmtPartnerDate(item.dokument.gueltig_bis)}
            </p>
          ) : null}
          {item.ablauf_hinweis ? (
            <p
              className={cn(
                "portal-text-meta mt-1 font-medium",
                item.status === "abgelaufen" || item.status === "offen"
                  ? "text-red-700"
                  : "text-amber-800"
              )}
            >
              {item.ablauf_hinweis}
            </p>
          ) : null}
          {item.status === "abgelehnt" && item.dokument?.ablehnung_grund ? (
            <p className="portal-text-meta mt-1 text-red-700">
              Grund: {item.dokument.ablehnung_grund}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 portal-text-meta font-semibold",
            statusClass(item.status)
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {complianceStatusLabel(item.status)}
        </span>
      </div>

      {item.dokument?.signed_url ? (
        <a
          href={item.dokument.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-text-meta mt-2 inline-block font-medium text-accent underline-offset-2 hover:underline"
        >
          Hochgeladenes Dokument ansehen
        </a>
      ) : null}

      {kannHochladen ? (
        <div className="mt-3">
          <FileUploadField
            label={
              item.status === "abgelaufen" || item.status === "ablauf_warnung"
                ? "Neu hochladen"
                : "Datei hochladen"
            }
            accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
            hint="PDF oder Foto (JPG/PNG)"
            selectedName={loading ? "Wird hochgeladen…" : null}
            onChange={onUpload}
          />
          {uploadOk ? (
            <p className="portal-text-meta mt-1 font-medium text-emerald-700" role="status">
              Hochgeladen — wird von Bärenwald geprüft.
            </p>
          ) : null}
          {error ? (
            <p className="portal-text-meta mt-1 text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ItemList({
  items,
  auftragId,
  disabled,
}: {
  items: PartnerComplianceItem[];
  auftragId?: string | null;
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <ComplianceRow
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
      <section className="space-y-2">
        <h4 className="portal-text-section">{title}</h4>
        <p className="portal-text-body text-text-secondary">{emptyText}</p>
      </section>
    );
  }

  const offen = items.filter(
    (i) =>
      i.pflicht &&
      i.status !== "erledigt" &&
      i.status !== "in_pruefung" &&
      i.status !== "ablauf_warnung"
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="portal-text-section">{title}</h4>
        {offen > 0 ? (
          <span className="tag bg-amber-100 text-amber-800">
            {offen} Pflicht {offen === 1 ? "offen" : "offen"}
          </span>
        ) : (
          <span className="tag bg-emerald-100 text-emerald-700">Vollständig</span>
        )}
      </div>
      {gruppiert ? (
        <div className="space-y-4">
          {gruppeComplianceItems(items).map((gruppe) => (
            <div key={gruppe.kategorie} className="space-y-2">
              <h5 className="portal-text-meta font-semibold uppercase tracking-wide text-text-tertiary">
                {gruppe.kategorie}
              </h5>
              <ItemList items={gruppe.items} auftragId={auftragId} disabled={disabled} />
            </div>
          ))}
        </div>
      ) : (
        <ItemList items={items} auftragId={auftragId} disabled={disabled} />
      )}
    </section>
  );
}
