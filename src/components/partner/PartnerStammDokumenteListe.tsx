"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import {
  deletePartnerComplianceDokument,
  uploadPartnerComplianceDokument,
} from "@/app/actions/partner-compliance";
import { PartnerDetailSection } from "@/components/partner/PartnerDetailUi";
import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import {
  complianceStatusLabel,
  type PartnerComplianceItem,
} from "@/lib/partner/partner-compliance";
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

function statusPillClass(status: PartnerComplianceItem["status"]): string {
  if (status === "erledigt") return "bg-emerald-100 text-emerald-700";
  if (status === "in_pruefung") return "bg-amber-100 text-amber-800";
  if (status === "abgelehnt" || status === "abgelaufen") return "bg-red-100 text-red-700";
  if (status === "ablauf_warnung") return "bg-amber-100 text-amber-800";
  return "bg-muted text-text-secondary";
}

function rahmenStatusPillClass(akzeptiert: boolean): string {
  return akzeptiert ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800";
}

function DokumentAktionen({
  href,
  name,
  kannHochladen,
  kannLoeschen,
  loading,
  onUpload,
  onDelete,
}: {
  href?: string;
  name: string;
  kannHochladen?: boolean;
  kannLoeschen?: boolean;
  loading?: boolean;
  onUpload?: (file: File) => void;
  onDelete?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-end gap-1">
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
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onUpload) onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-accent transition-colors hover:bg-accent-light/30 disabled:opacity-50"
            aria-label={`${name} hochladen`}
          >
            <Upload className="h-4 w-4" />
          </button>
        </>
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

function ComplianceDokumentRow({
  item,
  disabled,
}: {
  item: PartnerComplianceItem;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const href = item.dokument?.signed_url?.trim();
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

  async function onUpload(file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("typ", item.slug);
    fd.set("bezeichnung", item.bezeichnung);
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
    const res = await deletePartnerComplianceDokument({ dokumentId: item.dokument.id });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.complianceGeloescht(item.bezeichnung);
    router.refresh();
  }

  return (
    <>
      <tr className="border-b border-border-light last:border-b-0">
        <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
          {fmtDatum(item.dokument?.hochgeladen_am ?? item.dokument?.freigegeben_am)}
        </td>
        <td className="min-w-0 px-3 py-3">
          <p className="font-medium text-text-primary line-clamp-2">{item.bezeichnung}</p>
          {item.status === "abgelehnt" && item.dokument?.ablehnung_grund ? (
            <p className="portal-text-meta mt-0.5 text-red-700 line-clamp-2">
              {item.dokument.ablehnung_grund}
            </p>
          ) : null}
          <span
            className={cn(
              "tag mt-1.5 inline-flex text-[11px] sm:hidden",
              statusPillClass(item.status)
            )}
          >
            {complianceStatusLabel(item.status)}
          </span>
          {error ? (
            <p className="portal-text-meta mt-0.5 text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </td>
        <td className="hidden px-3 py-3 sm:table-cell">
          <span className={cn("tag text-[11px]", statusPillClass(item.status))}>
            {complianceStatusLabel(item.status)}
          </span>
        </td>
        <td className="w-[5.5rem] px-2 py-2 text-right">
          <DokumentAktionen
            href={href}
            name={item.bezeichnung}
            kannHochladen={kannHochladen}
            kannLoeschen={kannLoeschen}
            loading={loading}
            onUpload={(file) => void onUpload(file)}
            onDelete={() => void onDelete()}
          />
        </td>
      </tr>
    </>
  );
}

function RahmenvertragDokumentRow({
  rahmenvertrag,
  akzeptiert,
  pdfUrl,
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  akzeptiert: boolean;
  pdfUrl?: string | null;
}) {
  const datum =
    rahmenvertrag?.portal_akzeptiert_am ??
    rahmenvertrag?.signiert_am ??
    null;

  return (
    <tr className="border-b border-border-light last:border-b-0">
      <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
        {fmtDatum(datum)}
      </td>
      <td className="min-w-0 px-3 py-3">
        <p className="font-medium text-text-primary">Partnerschafts-Rahmenvertrag</p>
        <p className="portal-text-meta mt-0.5 text-text-secondary line-clamp-2">
          {rahmenvertrag?.vertrags_nr
            ? `Nr. ${rahmenvertrag.vertrags_nr}`
            : "Bei Registrierung akzeptiert — PDF folgt vom CRM"}
        </p>
        <span
          className={cn(
            "tag mt-1.5 inline-flex text-[11px] sm:hidden",
            rahmenStatusPillClass(akzeptiert)
          )}
        >
          {akzeptiert ? "Akzeptiert" : "Ausstehend"}
        </span>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <span className={cn("tag text-[11px]", rahmenStatusPillClass(akzeptiert))}>
          {akzeptiert ? "Akzeptiert" : "Ausstehend"}
        </span>
      </td>
      <td className="w-[5.5rem] px-2 py-2 text-right">
        {pdfUrl ? (
          <DokumentAktionen href={pdfUrl} name="Partnerschafts-Rahmenvertrag" />
        ) : (
          <span className="portal-text-meta text-text-tertiary">—</span>
        )}
      </td>
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
  const hatHandwerkskarte = handwerkskarte.length > 0;

  return (
    <PartnerDetailSection title="Stammunterlagen">
      <p className="portal-text-meta mb-3 text-text-secondary">
        Rahmenvertrag und Handwerkskarte auf einen Blick — Datum, Status und Download wie bei
        Vorgangs-Dokumenten.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border-light">
        <table className="portal-text-body w-full min-w-[20rem]">
          <thead>
            <tr className="portal-text-meta border-b border-border-light bg-muted/30 text-left text-text-tertiary">
              <th className="px-3 py-2.5 font-semibold">Datum</th>
              <th className="px-3 py-2.5 font-semibold">Dokument</th>
              <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Status</th>
              <th className="w-[5.5rem] px-2 py-2.5 text-right font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <RahmenvertragDokumentRow
              rahmenvertrag={rahmenvertrag}
              akzeptiert={akzeptiert}
              pdfUrl={pdfUrl}
            />
            {handwerkskarte.map((item) => (
              <ComplianceDokumentRow key={`${item.ebene}-${item.slug}`} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      {!hatHandwerkskarte ? (
        <p className="portal-text-meta mt-3 text-text-tertiary">
          Handwerkskarte erscheint hier, sobald sie im CRM hinterlegt ist.
        </p>
      ) : null}

      {akzeptiert && !pdfUrl ? (
        <p className="portal-text-meta mt-3 text-emerald-800">
          Rahmenvertrag bei Registrierung akzeptiert — personalisiertes PDF stellt Bärenwald
          bereit.
          {rahmenvertrag?.portal_akzeptiert_am ? (
            <>
              {" "}
              (Akzeptiert am {fmtPartnerDate(rahmenvertrag.portal_akzeptiert_am)})
            </>
          ) : null}
        </p>
      ) : null}

      {footer ? <div className="mt-4 border-t border-border-light pt-4">{footer}</div> : null}
    </PartnerDetailSection>
  );
}
