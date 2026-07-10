"use client";

import { Download } from "lucide-react";

import { PdfFileIcon } from "@/components/shared/PdfFileIcon";
import { cn } from "@/lib/utils";

export type DokumentZeile = {
  id: string;
  datum?: string | null;
  name: string;
  href?: string;
};

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function DokumenteTabelle({
  dokumente,
  heading = "Dokumente",
  emptyText = "Noch keine Dokumente.",
  className,
}: {
  dokumente: DokumentZeile[];
  heading?: string;
  emptyText?: string;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5 border-t border-border-light pt-5", className)}>
      {heading?.trim() ? (
        <h4 className="portal-text-label text-text-tertiary">{heading}</h4>
      ) : null}
      {dokumente.length === 0 ? (
        <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-5 text-center text-text-secondary">
          {emptyText}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-light">
          <table className="portal-text-body w-full">
            <thead>
              <tr className="portal-text-meta border-b border-border-light bg-muted/30 text-left text-text-tertiary">
                <th className="px-3 py-2.5 font-semibold">Datum</th>
                <th className="px-3 py-2.5 font-semibold">Dateiname</th>
                <th className="w-[5.5rem] px-2 py-2.5 text-right font-semibold">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {dokumente.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-border-light last:border-b-0"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-text-secondary tabular-nums">
                    {fmtDatum(doc.datum)}
                  </td>
                  <td className="min-w-0 px-3 py-3 font-medium text-text-primary">
                    <span className="line-clamp-2">{doc.name}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    {doc.href?.trim() ? (
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={normalizeHref(doc.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-[#c62828] transition-colors hover:bg-red-50"
                          aria-label={`${doc.name} ansehen`}
                        >
                          <PdfFileIcon className="h-5 w-5" />
                        </a>
                        <a
                          href={normalizeHref(doc.href)}
                          download
                          className="portal-touch-target inline-grid place-items-center rounded-lg border border-border-light bg-white text-text-secondary transition-colors hover:bg-muted/40"
                          aria-label={`${doc.name} herunterladen`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="portal-text-meta text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function portalDokumenteToZeilen(
  docs: Array<{
    id: string;
    name: string;
    subtitle?: string;
    datum?: string;
    href?: string;
  }>
): DokumentZeile[] {
  return docs.map((d) => ({
    id: d.id,
    datum: d.datum,
    name: d.subtitle ? `${d.name} — ${d.subtitle}` : d.name,
    href: d.href?.trim() || undefined,
  }));
}
