"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, Trash2, Upload } from "lucide-react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { gruppeComplianceItems } from "@/lib/partner/compliance-summary";
import {
  complianceStatusLabel,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
import { cn } from "@/lib/utils";

function statusPillClass(status: PartnerComplianceItem["status"]): string {
  if (status === "erledigt") return "bg-emerald-100 text-emerald-700";
  if (status === "in_pruefung") return "bg-amber-100 text-amber-800";
  if (status === "abgelehnt" || status === "abgelaufen") return "bg-red-100 text-red-700";
  if (status === "ablauf_warnung") return "bg-amber-100 text-amber-800";
  return "bg-muted text-text-secondary";
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
    if (!confirm(`„${item.bezeichnung}“ wirklich entfernen?`)) return;
    setLoading(true);
    setError(null);
    const res = await deletePartnerComplianceDokument({
      dokumentId: item.dokument.id,
      auftragId: uploadAuftragIdForItem(item, auftragId),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.complianceGeloescht(item.bezeichnung);
    router.refresh();
  }

  return (
    <li className="border-b border-border-light last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="portal-text-body font-medium text-text-primary line-clamp-2">
            {item.bezeichnung}
          </p>
          {item.status === "abgelehnt" && item.dokument?.ablehnung_grund ? (
            <p className="portal-text-meta mt-0.5 text-red-700 line-clamp-2">
              {item.dokument.ablehnung_grund}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "tag shrink-0 text-[11px]",
            statusPillClass(item.status)
          )}
        >
          {complianceStatusLabel(item.status)}
        </span>
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
              onClick={() => void onDelete()}
              className="portal-touch-target inline-grid place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
              aria-label={`${item.bezeichnung} löschen`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="portal-text-meta px-3 pb-2 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </li>
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
      <div className="divide-y divide-border-light">
        {gruppeComplianceItems(items).map((gruppe) => (
          <div key={gruppe.kategorie}>
            <p className="portal-text-meta bg-muted/30 px-3 py-2 font-semibold uppercase tracking-wide text-text-tertiary">
              {gruppe.kategorie}
            </p>
            <ul>
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
    <ul>
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
  if (!items.length) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border-light bg-surface-card">
      <div className="border-b border-border-light px-4 py-3">
        <h4 className="portal-text-section text-text-primary">{title}</h4>
        <p className="portal-text-meta mt-0.5 text-text-secondary">
          {items.length} {items.length === 1 ? "Punkt" : "Punkte"} — hochladen, ansehen oder
          löschen direkt in der Zeile
        </p>
      </div>
      <KompaktListe
        items={items}
        auftragId={auftragId}
        disabled={disabled}
        gruppiert={gruppiert}
      />
      {items.length === 0 ? (
        <p className="portal-text-body px-4 py-6 text-text-secondary">{emptyText}</p>
      ) : null}
    </section>
  );
}
